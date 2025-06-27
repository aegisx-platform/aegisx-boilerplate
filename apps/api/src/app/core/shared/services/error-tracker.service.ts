/**
 * Error Tracker Service
 * 
 * Centralized error tracking, analysis, and reporting service
 * with healthcare compliance and monitoring capabilities
 */

import { EventBus } from '../events/interfaces/event-bus.interface'
import {
  ErrorTrackedEvent,
  ErrorThresholdExceededEvent,
  ErrorReportGeneratedEvent
} from '../events/types/service-events.types'
import crypto from 'crypto'
import {
  IErrorTracker,
  TrackableError,
  ErrorContext,
  TrackedError,
  ErrorFilter,
  ErrorStats,
  ErrorTrend,
  ErrorReport,
  ErrorTrackerConfig,
  ErrorLevel,
  ErrorCategory,
  ErrorSeverity,
  ErrorImpact,
  ErrorFrequency,
  TimeFrame,
  TimePeriod,
  ReportOptions,
  ErrorGroup,
  DefaultErrorTrackerConfig,
  Breadcrumb
} from '../types/error-tracker.types'

export class ErrorTrackerService implements IErrorTracker {
  private errors: Map<string, TrackedError> = new Map()
  private errorGroups: Map<string, ErrorGroup> = new Map()
  private breadcrumbs: Breadcrumb[] = []
  private config: ErrorTrackerConfig
  private isStarted = false
  private flushInterval?: NodeJS.Timeout
  private errorQueue: Array<{ error: TrackableError; context: ErrorContext }> = []

  constructor(
    config: Partial<ErrorTrackerConfig> = {},
    private eventBus?: EventBus
  ) {
    
    this.config = {
      ...DefaultErrorTrackerConfig,
      ...config
    }
  }

  /**
   * Track an error asynchronously
   */
  async track(error: TrackableError, context: ErrorContext = {}): Promise<string> {
    if (!this.config.enabled) {
      return ''
    }

    // Apply sampling if enabled
    if (this.config.filters.enableSampling && Math.random() > this.config.filters.samplingRate) {
      return ''
    }

    // Apply filters
    if (!this.shouldTrackError(error)) {
      return ''
    }

    // Add to queue for batch processing
    if (this.config.performance.enableAsyncProcessing) {
      this.errorQueue.push({ error, context })
      
      if (this.errorQueue.length >= this.config.performance.batchSize) {
        await this.processErrorQueue()
      }
      
      return 'queued'
    }

    return this.processError(error, context)
  }

  /**
   * Track an error synchronously
   */
  trackSync(error: TrackableError, context: ErrorContext = {}): string {
    if (!this.config.enabled || !this.shouldTrackError(error)) {
      return ''
    }

    return this.processError(error, context)
  }

  /**
   * Get a specific error by ID
   */
  async getError(errorId: string): Promise<TrackedError | null> {
    return this.errors.get(errorId) || null
  }

  /**
   * Get errors with filtering
   */
  async getErrors(filter: ErrorFilter = {}): Promise<TrackedError[]> {
    let errors = Array.from(this.errors.values())

    // Apply filters
    if (filter.startTime) {
      errors = errors.filter(e => e.timestamp >= filter.startTime!)
    }
    
    if (filter.endTime) {
      errors = errors.filter(e => e.timestamp <= filter.endTime!)
    }
    
    if (filter.levels?.length) {
      errors = errors.filter(e => filter.levels!.includes(e.error.level))
    }
    
    if (filter.categories?.length) {
      errors = errors.filter(e => filter.categories!.includes(e.error.category))
    }
    
    if (filter.severities?.length) {
      errors = errors.filter(e => filter.severities!.includes(e.error.severity))
    }
    
    if (filter.status?.length) {
      errors = errors.filter(e => filter.status!.includes(e.status))
    }
    
    if (filter.userId) {
      errors = errors.filter(e => e.context.userId === filter.userId)
    }
    
    if (filter.service) {
      errors = errors.filter(e => e.context.service === filter.service)
    }
    
    if (filter.environment) {
      errors = errors.filter(e => e.context.environment === filter.environment)
    }
    
    if (filter.patientId) {
      errors = errors.filter(e => e.context.patientId === filter.patientId)
    }
    
    if (filter.facilityId) {
      errors = errors.filter(e => e.context.facilityId === filter.facilityId)
    }
    
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      errors = errors.filter(e => 
        e.error.message.toLowerCase().includes(query) ||
        e.error.name.toLowerCase().includes(query) ||
        (e.error.stack && e.error.stack.toLowerCase().includes(query))
      )
    }

    // Sort
    if (filter.sortBy) {
      errors.sort((a, b) => {
        let aValue: any, bValue: any
        
        switch (filter.sortBy) {
          case 'timestamp':
            aValue = a.timestamp.getTime()
            bValue = b.timestamp.getTime()
            break
          case 'count':
            aValue = a.count
            bValue = b.count
            break
          case 'severity':
            aValue = this.getSeverityWeight(a.error.severity)
            bValue = this.getSeverityWeight(b.error.severity)
            break
          case 'impact':
            aValue = this.getImpactWeight(a.impact.severity)
            bValue = this.getImpactWeight(b.impact.severity)
            break
          default:
            return 0
        }
        
        return filter.sortOrder === 'desc' ? bValue - aValue : aValue - bValue
      })
    }

    // Pagination
    if (filter.offset) {
      errors = errors.slice(filter.offset)
    }
    
    if (filter.limit) {
      errors = errors.slice(0, filter.limit)
    }

    return errors
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeframe?: TimeFrame): Promise<ErrorStats> {
    const now = new Date()
    const defaultTimeframe: TimeFrame = {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now,
      duration: 24 * 60 * 60 * 1000
    }

    const actualTimeframe = timeframe || defaultTimeframe
    const errors = await this.getErrors({
      startTime: actualTimeframe.start,
      endTime: actualTimeframe.end
    })

    // Basic stats
    const totalErrors = errors.length
    const uniqueErrors = new Set(errors.map(e => e.fingerprint)).size
    const errorRate = totalErrors / (actualTimeframe.duration / 60000) // per minute

    // Group by level
    const byLevel: Record<ErrorLevel, number> = {
      debug: 0, info: 0, warn: 0, error: 0, fatal: 0
    }
    
    // Group by category
    const byCategory: Record<ErrorCategory, number> = {
      system: 0, application: 0, network: 0, database: 0, 
      external: 0, user: 0, security: 0, healthcare: 0
    }
    
    // Group by severity
    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    }

    errors.forEach(error => {
      byLevel[error.error.level]++
      byCategory[error.error.category]++
      bySeverity[error.error.severity]++
    })

    // Top errors
    const errorCounts = new Map<string, { count: number; error: TrackedError }>()
    errors.forEach(error => {
      const existing = errorCounts.get(error.fingerprint)
      if (existing) {
        existing.count += error.count
      } else {
        errorCounts.set(error.fingerprint, { count: error.count, error })
      }
    })

    const topErrors = Array.from(errorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ count, error }) => ({
        fingerprint: error.fingerprint,
        count,
        message: error.error.message,
        lastSeen: error.lastSeen
      }))

    // Hourly trend
    const hourlyTrend = this.calculateHourlyTrend(errors, actualTimeframe)

    // Performance impact
    const performanceImpact = this.calculatePerformanceImpact(errors)

    // Healthcare stats
    const healthcareStats = this.config.healthcare ? this.calculateHealthcareStats(errors) : undefined

    return {
      timeframe: actualTimeframe,
      totalErrors,
      uniqueErrors,
      errorRate,
      byLevel,
      byCategory,
      bySeverity,
      topErrors,
      hourlyTrend,
      performanceImpact,
      healthcareStats
    }
  }

  /**
   * Get error trends over time
   */
  async getErrorTrends(period: TimePeriod = 'day'): Promise<ErrorTrend[]> {
    const now = new Date()
    const periodDuration = this.getPeriodDuration(period)
    const intervals = this.getPeriodIntervals(period)
    
    const trends: ErrorTrend[] = []

    for (let i = intervals - 1; i >= 0; i--) {
      const end = new Date(now.getTime() - i * periodDuration)
      const start = new Date(end.getTime() - periodDuration)
      
      const errors = await this.getErrors({ startTime: start, endTime: end })
      const uniqueErrors = new Set(errors.map(e => e.fingerprint)).size
      
      const topError = errors.length > 0 ? this.findTopError(errors) : undefined

      trends.push({
        timestamp: start,
        errorCount: errors.length,
        errorRate: errors.length / (periodDuration / 60000),
        uniqueErrors,
        topError
      })
    }

    return trends
  }

  /**
   * Generate error report
   */
  async generateReport(options: ReportOptions = {}): Promise<ErrorReport> {
    const now = new Date()
    const timeframe = options.timeframe || {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      end: now,
      duration: 24 * 60 * 60 * 1000
    }

    const stats = await this.getErrorStats(timeframe)
    const trends = await this.getErrorTrends(options.period || 'day')
    const topErrors = await this.getErrors({
      startTime: timeframe.start,
      endTime: timeframe.end,
      sortBy: 'count',
      sortOrder: 'desc',
      limit: 20
    })

    const report: ErrorReport = {
      id: crypto.randomUUID(),
      title: options.title || `Error Report - ${timeframe.start.toISOString().split('T')[0]}`,
      type: options.type || 'summary',
      generatedAt: now,
      timeframe,
      
      summary: {
        totalErrors: stats.totalErrors,
        uniqueErrors: stats.uniqueErrors,
        errorRate: stats.errorRate,
        topCategories: Object.entries(stats.byCategory)
          .map(([category, count]) => ({
            category: category as ErrorCategory,
            count,
            percentage: (count / stats.totalErrors) * 100
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        criticalIssues: stats.bySeverity.critical,
        resolvedIssues: Array.from(this.errors.values())
          .filter(e => e.status === 'resolved').length,
        newIssues: Array.from(this.errors.values())
          .filter(e => e.status === 'new').length
      },
      
      details: {
        errorBreakdown: stats,
        trends,
        topErrors,
        performanceImpact: {
          slowestOperations: this.getSlowOperations(topErrors),
          resourceUsage: this.getResourceUsage()
        }
      },
      
      recommendations: this.generateRecommendations(stats, trends)
    }

    // Add healthcare compliance section if enabled
    if (this.config.healthcare) {
      report.complianceSection = {
        violations: this.findComplianceViolations(topErrors),
        auditTrail: this.generateAuditTrail(timeframe),
        riskAssessment: this.assessRisk(stats)
      }
    }

    this.emitEvent('report-generated', { report })
    
    return report
  }

  /**
   * Configure the error tracker
   */
  configure(config: Partial<ErrorTrackerConfig>): void {
    this.config = {
      ...this.config,
      ...config
    }
  }

  /**
   * Start the error tracker
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return
    }

    this.isStarted = true
    
    // Start flush interval for batch processing
    if (this.config.performance.enableAsyncProcessing) {
      this.flushInterval = setInterval(async () => {
        await this.processErrorQueue()
      }, this.config.performance.flushInterval)
    }

    // Tracker started - no event bus mapping needed
  }

  /**
   * Stop the error tracker
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return
    }

    this.isStarted = false
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = undefined
    }

    // Process remaining errors in queue
    if (this.errorQueue.length > 0) {
      await this.processErrorQueue()
    }

    // Tracker stopped - no event bus mapping needed
  }

  // Private methods

  private shouldTrackError(error: TrackableError): boolean {
    // Check minimum level
    if (this.getLevelWeight(error.level) < this.getLevelWeight(this.config.filters.minimumLevel)) {
      return false
    }

    // Check ignore patterns
    for (const pattern of this.config.filters.ignorePatterns) {
      const regex = new RegExp(pattern)
      if (regex.test(error.message) || regex.test(error.name)) {
        return false
      }
    }

    // Check ignore types
    if (this.config.filters.ignoreTypes.includes(error.name)) {
      return false
    }

    // Check ignore status codes
    if (error.http?.statusCode && this.config.filters.ignoreStatuses.includes(error.http.statusCode)) {
      return false
    }

    return true
  }

  private processError(error: TrackableError, context: ErrorContext): string {
    const timestamp = new Date()
    const fingerprint = this.generateFingerprint(error)
    
    // Enhance context
    const enhancedContext: ErrorContext = {
      ...context,
      timestamp,
      service: context.service || this.config.serviceName,
      version: context.version || this.config.version,
      environment: context.environment || this.config.environment,
      hostname: context.hostname || require('os').hostname(),
      breadcrumbs: [...this.breadcrumbs]
    }

    // Check if we already have this error
    const existingError = Array.from(this.errors.values())
      .find(e => e.fingerprint === fingerprint)

    if (existingError && this.config.aggregation.enabled) {
      // Update existing error
      existingError.count++
      existingError.lastSeen = timestamp
      existingError.frequency = this.calculateFrequency(existingError)
      existingError.impact = this.calculateImpact(existingError)
      
      this.errors.set(existingError.id, existingError)
      // Error updated - no event bus mapping needed
      
      return existingError.id
    }

    // Create new tracked error
    const trackedError: TrackedError = {
      id: crypto.randomUUID(),
      fingerprint,
      error,
      context: enhancedContext,
      timestamp,
      firstSeen: timestamp,
      lastSeen: timestamp,
      count: 1,
      status: 'new',
      impact: this.calculateImpact({ error, context: enhancedContext, count: 1 } as TrackedError),
      frequency: this.calculateFrequency({ count: 1, firstSeen: timestamp, lastSeen: timestamp } as TrackedError)
    }

    // Add healthcare data if applicable
    if (this.config.healthcare && this.isHealthcareError(error, enhancedContext)) {
      trackedError.healthcareData = this.extractHealthcareData(error, enhancedContext)
    }

    this.errors.set(trackedError.id, trackedError)
    
    // Update error groups
    this.updateErrorGroups(trackedError)
    
    // Add breadcrumb
    this.addBreadcrumb({
      timestamp,
      level: error.level,
      message: error.message,
      category: error.category,
      data: { errorId: trackedError.id }
    })

    // Emit events
    this.emitEvent('error-tracked', { errorId: trackedError.id, error: trackedError })
    
    // Check thresholds
    this.checkThresholds(trackedError)
    
    return trackedError.id
  }

  private async processErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0) {
      return
    }

    const batch = this.errorQueue.splice(0, this.config.performance.batchSize)
    
    for (const { error, context } of batch) {
      try {
        this.processError(error, context)
      } catch (err) {
        console.error('Error processing error in batch:', err)
      }
    }
  }

  private generateFingerprint(error: TrackableError): string {
    const fields = [
      error.name,
      error.message,
      error.code?.toString(),
      error.source?.file,
      error.source?.function
    ].filter(Boolean)

    if (error.stack) {
      // Extract meaningful stack trace lines
      const stackLines = error.stack.split('\n')
        .slice(0, 3)
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      fields.push(...stackLines)
    }

    return crypto.createHash('md5')
      .update(fields.join('|'))
      .digest('hex')
  }

  private calculateImpact(error: TrackedError): ErrorImpact {
    const severity = error.error.severity
    const affectedUsers = this.countAffectedUsers(error)
    const affectedSessions = this.countAffectedSessions(error)
    
    let businessImpact: ErrorImpact['businessImpact']
    if (severity === 'critical' || error.error.category === 'security') {
      businessImpact = 'critical'
    } else if (severity === 'high' || error.count > 100) {
      businessImpact = 'high'
    } else if (severity === 'medium' || error.count > 10) {
      businessImpact = 'medium'
    } else if (error.count > 1) {
      businessImpact = 'low'
    } else {
      businessImpact = 'none'
    }

    return {
      severity,
      affectedUsers,
      affectedSessions,
      businessImpact
    }
  }

  private calculateFrequency(error: TrackedError): ErrorFrequency {
    const now = new Date()
    const hoursSinceFirst = (now.getTime() - error.firstSeen.getTime()) / (1000 * 60 * 60)
    const daysSinceFirst = hoursSinceFirst / 24

    const perHour = hoursSinceFirst > 0 ? error.count / hoursSinceFirst : error.count
    const perDay = daysSinceFirst > 0 ? error.count / daysSinceFirst : error.count

    // Determine trend (simplified)
    let trend: ErrorFrequency['trend'] = 'stable'
    if (error.count > 1) {
      const recentErrors = this.getRecentErrorsForFingerprint(error.fingerprint, 60 * 60 * 1000) // Last hour
      const olderErrors = this.getRecentErrorsForFingerprint(error.fingerprint, 2 * 60 * 60 * 1000, 60 * 60 * 1000) // Previous hour
      
      if (recentErrors > olderErrors * 1.5) {
        trend = 'increasing'
      } else if (recentErrors < olderErrors * 0.5) {
        trend = 'decreasing'
      }
    }

    return {
      total: error.count,
      perHour,
      perDay,
      trend,
      peakHours: this.calculatePeakHours(error)
    }
  }

  private updateErrorGroups(error: TrackedError): void {
    const groupId = this.findOrCreateErrorGroup(error)
    error.groupId = groupId

    const group = this.errorGroups.get(groupId)!
    group.errors.push(error)
    group.count = group.errors.reduce((sum, e) => sum + e.count, 0)
    group.lastSeen = error.lastSeen

    // Error grouped - no event bus mapping needed
  }

  private findOrCreateErrorGroup(error: TrackedError): string {
    // Find existing group with same fingerprint
    for (const [groupId, group] of this.errorGroups.entries()) {
      if (group.fingerprint === error.fingerprint) {
        return groupId
      }
    }

    // Create new group
    const groupId = crypto.randomUUID()
    const group: ErrorGroup = {
      id: groupId,
      fingerprint: error.fingerprint,
      title: error.error.message,
      count: 0,
      firstSeen: error.firstSeen,
      lastSeen: error.lastSeen,
      errors: [],
      status: 'new'
    }

    this.errorGroups.set(groupId, group)
    return groupId
  }

  private addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb)
    
    // Keep only recent breadcrumbs
    const maxBreadcrumbs = 50
    if (this.breadcrumbs.length > maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-maxBreadcrumbs)
    }
  }

  private checkThresholds(error: TrackedError): void {
    if (!this.config.alerting.enabled) {
      return
    }

    const recentErrors = this.getRecentErrors(60000) // Last minute
    const errorRate = recentErrors.length

    // Check error rate threshold
    if (errorRate >= this.config.alerting.thresholds.errorRate) {
      this.emitEvent('threshold-exceeded', {
        type: 'error-rate',
        threshold: this.config.alerting.thresholds.errorRate,
        actual: errorRate,
        errors: recentErrors
      })
    }

    // Check critical error threshold
    if (error.error.severity === 'critical') {
      const recentCriticalErrors = recentErrors.filter(e => e.error.severity === 'critical')
      if (recentCriticalErrors.length >= this.config.alerting.thresholds.criticalErrors) {
        this.emitEvent('threshold-exceeded', {
          type: 'critical-errors',
          threshold: this.config.alerting.thresholds.criticalErrors,
          actual: recentCriticalErrors.length,
          errors: recentCriticalErrors
        })
      }
    }

    // Check new error type
    if (this.config.alerting.thresholds.newErrorTypes && error.count === 1) {
      this.emitEvent('threshold-exceeded', {
        type: 'new-error-type',
        threshold: 1,
        actual: 1,
        errors: [error]
      })
    }
  }

  // Utility methods

  private getLevelWeight(level: ErrorLevel): number {
    const weights = { debug: 1, info: 2, warn: 3, error: 4, fatal: 5 }
    return weights[level] || 0
  }

  private getSeverityWeight(severity: ErrorSeverity): number {
    const weights = { low: 1, medium: 2, high: 3, critical: 4 }
    return weights[severity] || 0
  }

  private getImpactWeight(severity: ErrorSeverity): number {
    return this.getSeverityWeight(severity)
  }

  private calculateHourlyTrend(errors: TrackedError[], timeframe: TimeFrame): Array<{ hour: number; count: number }> {
    const hourlyCount = new Array(24).fill(0)
    
    errors.forEach(error => {
      const hour = error.timestamp.getHours()
      hourlyCount[hour] += error.count
    })

    return hourlyCount.map((count, hour) => ({ hour, count }))
  }

  private calculatePerformanceImpact(errors: TrackedError[]) {
    // Simplified performance impact calculation
    const responseTimeErrors = errors.filter(e => e.error.data?.responseTime)
    const avgResponseTime = responseTimeErrors.length > 0 
      ? responseTimeErrors.reduce((sum, e) => sum + (e.error.data?.responseTime || 0), 0) / responseTimeErrors.length
      : 0

    const endpointErrors = new Map<string, { count: number; totalTime: number }>()
    
    errors.forEach(error => {
      if (error.error.http?.url && error.error.data?.responseTime) {
        const endpoint = error.error.http.url
        const existing = endpointErrors.get(endpoint) || { count: 0, totalTime: 0 }
        existing.count += error.count
        existing.totalTime += error.error.data.responseTime * error.count
        endpointErrors.set(endpoint, existing)
      }
    })

    const slowestEndpoints = Array.from(endpointErrors.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        averageTime: data.totalTime / data.count,
        errorRate: data.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5)

    return {
      averageResponseTime: avgResponseTime,
      slowestEndpoints
    }
  }

  private calculateHealthcareStats(errors: TrackedError[]) {
    const patientDataErrors = errors.filter(e => e.context.isPatientData || e.context.patientId).length
    const complianceViolations = errors.filter(e => e.healthcareData?.complianceIssues?.length).length
    const auditableEvents = errors.filter(e => e.healthcareData?.auditRequired).length

    return {
      patientDataErrors,
      complianceViolations,
      auditableEvents
    }
  }

  private getPeriodDuration(period: TimePeriod): number {
    const durations = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    }
    return durations[period]
  }

  private getPeriodIntervals(period: TimePeriod): number {
    const intervals = {
      hour: 24,      // 24 hours
      day: 7,        // 7 days
      week: 4,       // 4 weeks
      month: 12,     // 12 months
      quarter: 4,    // 4 quarters
      year: 5        // 5 years
    }
    return intervals[period]
  }

  private findTopError(errors: TrackedError[]) {
    if (errors.length === 0) return undefined
    
    const errorCounts = new Map<string, number>()
    errors.forEach(error => {
      const count = errorCounts.get(error.error.message) || 0
      errorCounts.set(error.error.message, count + error.count)
    })

    const topError = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    return {
      message: topError[0],
      count: topError[1]
    }
  }

  private countAffectedUsers(error: TrackedError): number {
    // This would typically query the database for unique users
    // For now, return a simple estimate
    return error.context.userId ? 1 : Math.min(error.count, 10)
  }

  private countAffectedSessions(error: TrackedError): number {
    // This would typically query the database for unique sessions
    // For now, return a simple estimate
    return error.context.sessionId ? 1 : Math.min(error.count, 5)
  }

  private getRecentErrorsForFingerprint(fingerprint: string, duration: number, offset = 0): number {
    const now = new Date()
    const startTime = new Date(now.getTime() - duration - offset)
    const endTime = new Date(now.getTime() - offset)

    return Array.from(this.errors.values())
      .filter(e => 
        e.fingerprint === fingerprint &&
        e.timestamp >= startTime &&
        e.timestamp <= endTime
      )
      .reduce((sum, e) => sum + e.count, 0)
  }

  private calculatePeakHours(error: TrackedError): number[] {
    // Simplified peak hours calculation
    const hour = error.timestamp.getHours()
    return [hour]
  }

  private getRecentErrors(duration: number): TrackedError[] {
    const cutoff = new Date(Date.now() - duration)
    return Array.from(this.errors.values())
      .filter(e => e.timestamp >= cutoff)
  }

  private isHealthcareError(error: TrackableError, context: ErrorContext): boolean {
    return !!(
      context.patientId ||
      context.facilityId ||
      context.isPatientData ||
      error.category === 'healthcare'
    )
  }

  private extractHealthcareData(error: TrackableError, context: ErrorContext) {
    return {
      affectedPatients: context.patientId ? [context.patientId] : [],
      facilityImpact: context.facilityId || 'unknown',
      complianceIssues: this.identifyComplianceIssues(error, context),
      auditRequired: error.severity === 'critical' || error.category === 'security'
    }
  }

  private identifyComplianceIssues(error: TrackableError, context: ErrorContext): string[] {
    const issues: string[] = []
    
    if (context.isPatientData && error.level === 'error') {
      issues.push('Patient data access error')
    }
    
    if (error.category === 'security') {
      issues.push('Security violation')
    }
    
    return issues
  }

  private generateRecommendations(stats: ErrorStats, trends: ErrorTrend[]): string[] {
    const recommendations: string[] = []

    if (stats.bySeverity.critical > 0) {
      recommendations.push('Address critical errors immediately')
    }

    if (stats.errorRate > 10) {
      recommendations.push('High error rate detected - investigate system stability')
    }

    if (stats.byCategory.database > stats.totalErrors * 0.3) {
      recommendations.push('High database error rate - check database connections and queries')
    }

    if (trends.length > 1 && trends[trends.length - 1].errorCount > trends[trends.length - 2].errorCount * 1.5) {
      recommendations.push('Error rate is increasing - monitor system closely')
    }

    return recommendations
  }

  private getSlowOperations(errors: TrackedError[]) {
    return errors
      .filter(e => e.error.data?.responseTime > 5000)
      .map(e => ({
        operation: e.error.http?.url || e.error.name,
        averageTime: e.error.data?.responseTime || 0,
        errorCount: e.count
      }))
      .slice(0, 5)
  }

  private getResourceUsage() {
    // This would typically integrate with system monitoring
    return {
      memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpu: 0, // Would need external monitoring
      database: 0 // Would need external monitoring
    }
  }

  private findComplianceViolations(errors: TrackedError[]) {
    return errors
      .filter(e => e.healthcareData?.complianceIssues?.length)
      .map(e => ({
        type: 'hipaa' as const,
        description: e.healthcareData?.complianceIssues?.[0] || 'Unknown violation',
        severity: e.error.severity,
        affectedRecords: e.healthcareData?.affectedPatients?.length || 0,
        remediation: ['Review access controls', 'Update security policies']
      }))
  }

  private generateAuditTrail(timeframe: TimeFrame) {
    return Array.from(this.errors.values())
      .filter(e => e.timestamp >= timeframe.start && e.timestamp <= timeframe.end)
      .filter(e => e.healthcareData?.auditRequired)
      .map(e => ({
        timestamp: e.timestamp,
        action: `Error tracked: ${e.error.name}`,
        userId: e.context.userId,
        details: {
          errorId: e.id,
          patientId: e.context.patientId,
          facilityId: e.context.facilityId
        },
        result: 'success' as const
      }))
  }

  private assessRisk(stats: ErrorStats) {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    if (stats.bySeverity.critical > 0) {
      riskLevel = 'critical'
    } else if (stats.bySeverity.high > 5) {
      riskLevel = 'high'
    } else if (stats.errorRate > 5) {
      riskLevel = 'medium'
    }

    return {
      overallRisk: riskLevel,
      factors: [
        {
          factor: 'Error rate',
          impact: stats.errorRate > 10 ? 'high' : stats.errorRate > 5 ? 'medium' : 'low' as 'low' | 'medium' | 'high',
          likelihood: 'medium' as 'low' | 'medium' | 'high',
          mitigation: 'Implement better error handling and monitoring'
        }
      ]
    }
  }

  /**
   * Emit events using Event Bus instead of EventEmitter
   */
  private emitEvent(eventType: string, data: any): void {
    if (!this.eventBus) {
      return
    }

    // Fire and forget event publishing
    setImmediate(async () => {
      try {
        const timestamp = new Date()

        switch (eventType) {
          case 'error-tracked':
            await this.eventBus?.publish('error-tracker.error-tracked', {
              errorId: data.errorId,
              errorName: data.error.name,
              errorLevel: data.error.level,
              errorCategory: data.error.category,
              errorSeverity: data.error.severity,
              timestamp,
              context: {
                userId: data.error.context?.userId,
                requestId: data.error.context?.requestId,
                patientId: data.error.context?.patientId,
                facilityId: data.error.context?.facilityId
              }
            } as ErrorTrackedEvent)
            break

          case 'threshold-exceeded':
            await this.eventBus?.publish('error-tracker.threshold-exceeded', {
              thresholdType: data.type || 'error-rate',
              threshold: data.threshold,
              actual: data.actual,
              errors: data.errors || [],
              timestamp
            } as ErrorThresholdExceededEvent)
            break

          case 'report-generated':
            await this.eventBus?.publish('error-tracker.report-generated', {
              reportId: data.report.id,
              reportType: data.report.type,
              title: data.report.title,
              timeframe: data.report.timeframe,
              summary: data.report.summary,
              timestamp
            } as ErrorReportGeneratedEvent)
            break
        }
      } catch (error) {
        console.warn(`Failed to publish error tracker event ${eventType}:`, error)
      }
    })
  }

  /**
   * Event listening not supported - use Event Bus subscriptions instead
   */
  on(event: string, listener: any): void {
    console.warn('Error Tracker event listening not supported. Use Event Bus subscriptions instead.')
  }

  /**
   * Event unsubscribing not supported - use Event Bus unsubscribe instead
   */
  off(event: string, listener: any): void {
    console.warn('Error Tracker event unsubscribing not supported. Use Event Bus unsubscribe instead.')
  }
}