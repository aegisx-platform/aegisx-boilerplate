/**
 * Job Scheduler Utility
 * 
 * Handles cron-based job scheduling with timezone support
 * and comprehensive schedule management
 */

import cronParser from 'cron-parser'
import {
  Schedule,
  ScheduleOptions,
  BackgroundJobsError
} from '../types/background-jobs.types'

export interface CronValidationResult {
  isValid: boolean
  error?: string
  nextRuns?: Date[]
}

export class JobScheduler {
  private schedules: Map<string, ScheduleInfo> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private isRunning = false

  constructor() {}

  /**
   * Add a new scheduled job
   */
  addSchedule(
    id: string,
    name: string,
    cronExpression: string,
    data: any = {},
    options: ScheduleOptions = {},
    handler: (schedule: Schedule) => Promise<void>
  ): Schedule {
    // Validate cron expression
    const validation = this.validateCronExpression(cronExpression, options.timezone)
    if (!validation.isValid) {
      throw new BackgroundJobsError(
        `Invalid cron expression: ${validation.error}`,
        'INVALID_CRON_EXPRESSION'
      )
    }

    const schedule: Schedule = {
      id,
      name,
      cronExpression,
      data,
      options,
      nextRun: this.getNextRunTime(cronExpression, options.timezone),
      isActive: true,
      createdAt: new Date()
    }

    const scheduleInfo: ScheduleInfo = {
      schedule,
      handler,
      runCount: 0
    }

    this.schedules.set(id, scheduleInfo)

    // Schedule the job if scheduler is running
    if (this.isRunning) {
      this.scheduleJob(scheduleInfo)
    }

    return schedule
  }

  /**
   * Remove a scheduled job
   */
  removeSchedule(id: string): boolean {
    const scheduleInfo = this.schedules.get(id)
    if (!scheduleInfo) {
      return false
    }

    // Clear any pending timer
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    this.schedules.delete(id)
    return true
  }

  /**
   * Update an existing schedule
   */
  updateSchedule(
    id: string,
    updates: Partial<Pick<Schedule, 'cronExpression' | 'data' | 'options' | 'isActive'>>
  ): Schedule | null {
    const scheduleInfo = this.schedules.get(id)
    if (!scheduleInfo) {
      return null
    }

    // Validate new cron expression if provided
    if (updates.cronExpression) {
      const validation = this.validateCronExpression(
        updates.cronExpression,
        updates.options?.timezone || scheduleInfo.schedule.options?.timezone
      )
      if (!validation.isValid) {
        throw new BackgroundJobsError(
          `Invalid cron expression: ${validation.error}`,
          'INVALID_CRON_EXPRESSION'
        )
      }
    }

    // Update schedule
    Object.assign(scheduleInfo.schedule, updates)

    // Recalculate next run time if cron expression or timezone changed
    if (updates.cronExpression || updates.options?.timezone) {
      scheduleInfo.schedule.nextRun = this.getNextRunTime(
        scheduleInfo.schedule.cronExpression,
        scheduleInfo.schedule.options?.timezone
      )
    }

    // Reschedule if running
    if (this.isRunning) {
      // Clear existing timer
      const timer = this.timers.get(id)
      if (timer) {
        clearTimeout(timer)
      }

      // Schedule again if active
      if (scheduleInfo.schedule.isActive) {
        this.scheduleJob(scheduleInfo)
      }
    }

    return scheduleInfo.schedule
  }

  /**
   * Get a schedule by ID
   */
  getSchedule(id: string): Schedule | null {
    const scheduleInfo = this.schedules.get(id)
    return scheduleInfo ? { ...scheduleInfo.schedule } : null
  }

  /**
   * Get all schedules
   */
  getSchedules(): Schedule[] {
    return Array.from(this.schedules.values()).map(info => ({ ...info.schedule }))
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // Schedule all active jobs
    for (const scheduleInfo of this.schedules.values()) {
      if (scheduleInfo.schedule.isActive) {
        this.scheduleJob(scheduleInfo)
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  /**
   * Validate a cron expression
   */
  validateCronExpression(expression: string, timezone?: string): CronValidationResult {
    try {
      const options = timezone ? { tz: timezone } : {}
      const interval = cronParser.parse(expression, options)
      
      // Get next few runs to validate
      const nextRuns: Date[] = []
      for (let i = 0; i < 5; i++) {
        nextRuns.push(interval.next().toDate())
      }

      return {
        isValid: true,
        nextRuns
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get the next run time for a cron expression
   */
  getNextRunTime(expression: string, timezone?: string): Date {
    try {
      const options = timezone ? { tz: timezone } : {}
      const interval = cronParser.parse(expression, options)
      return interval.next().toDate()
    } catch (error) {
      throw new BackgroundJobsError(
        `Failed to calculate next run time: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CRON_CALCULATION_ERROR'
      )
    }
  }

  /**
   * Get upcoming schedules within a time window
   */
  getUpcomingSchedules(within: number = 3600000): UpcomingSchedule[] {
    const now = new Date()
    const cutoff = new Date(now.getTime() + within)
    
    const upcoming: UpcomingSchedule[] = []

    for (const scheduleInfo of this.schedules.values()) {
      const schedule = scheduleInfo.schedule
      if (!schedule.isActive) continue

      // Check if next run is within the time window
      if (schedule.nextRun <= cutoff) {
        upcoming.push({
          schedule: { ...schedule },
          timeUntilRun: schedule.nextRun.getTime() - now.getTime(),
          runCount: scheduleInfo.runCount
        })
      }
    }

    // Sort by next run time
    upcoming.sort((a, b) => a.schedule.nextRun.getTime() - b.schedule.nextRun.getTime())

    return upcoming
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(scheduleInfo: ScheduleInfo): void {
    const { schedule, handler } = scheduleInfo
    const now = new Date()
    const delay = schedule.nextRun.getTime() - now.getTime()

    // If the scheduled time has passed, run immediately
    const actualDelay = Math.max(0, delay)

    const timer = setTimeout(async () => {
      try {
        // Check if schedule should still run
        if (!this.shouldRunSchedule(scheduleInfo)) {
          return
        }

        // Update last run and calculate next run
        schedule.lastRun = new Date()
        scheduleInfo.runCount++

        // Execute the handler
        await handler(schedule)

        // Calculate next run time
        try {
          schedule.nextRun = this.getNextRunTime(
            schedule.cronExpression,
            schedule.options?.timezone
          )

          // Check if we should continue scheduling
          if (this.shouldContinueScheduling(scheduleInfo)) {
            this.scheduleJob(scheduleInfo)
          } else {
            // Deactivate schedule if max runs reached or end date passed
            schedule.isActive = false
          }
        } catch (error) {
          console.error(`Failed to calculate next run for schedule ${schedule.id}:`, error)
          schedule.isActive = false
        }
      } catch (error) {
        console.error(`Failed to execute scheduled job ${schedule.id}:`, error)
        
        // Still calculate next run unless it's a critical error
        try {
          schedule.nextRun = this.getNextRunTime(
            schedule.cronExpression,
            schedule.options?.timezone
          )
          if (this.shouldContinueScheduling(scheduleInfo)) {
            this.scheduleJob(scheduleInfo)
          }
        } catch (nextRunError) {
          console.error(`Failed to reschedule after error for ${schedule.id}:`, nextRunError)
          schedule.isActive = false
        }
      } finally {
        this.timers.delete(schedule.id)
      }
    }, actualDelay)

    this.timers.set(schedule.id, timer)
  }

  /**
   * Check if a schedule should run
   */
  private shouldRunSchedule(scheduleInfo: ScheduleInfo): boolean {
    const { schedule } = scheduleInfo
    const now = new Date()

    // Check if active
    if (!schedule.isActive) {
      return false
    }

    // Check start date
    if (schedule.options?.startDate && now < schedule.options.startDate) {
      return false
    }

    // Check end date
    if (schedule.options?.endDate && now > schedule.options.endDate) {
      return false
    }

    // Check max runs
    if (schedule.options?.maxRuns && scheduleInfo.runCount >= schedule.options.maxRuns) {
      return false
    }

    return true
  }

  /**
   * Check if scheduling should continue for a job
   */
  private shouldContinueScheduling(scheduleInfo: ScheduleInfo): boolean {
    const { schedule } = scheduleInfo
    // const now = new Date() // not used

    // Check if still active
    if (!schedule.isActive) {
      return false
    }

    // Check end date
    if (schedule.options?.endDate && schedule.nextRun > schedule.options.endDate) {
      return false
    }

    // Check max runs
    if (schedule.options?.maxRuns && scheduleInfo.runCount >= schedule.options.maxRuns) {
      return false
    }

    return true
  }
}

// Internal types
interface ScheduleInfo {
  schedule: Schedule
  handler: (schedule: Schedule) => Promise<void>
  runCount: number
}

export interface UpcomingSchedule {
  schedule: Schedule
  timeUntilRun: number
  runCount: number
}

// Predefined cron expressions
export const CronExpressions = {
  // Every minute
  EVERY_MINUTE: '* * * * *',
  
  // Every hour
  EVERY_HOUR: '0 * * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  EVERY_12_HOURS: '0 */12 * * *',
  
  // Daily
  DAILY_MIDNIGHT: '0 0 * * *',
  DAILY_6AM: '0 6 * * *',
  DAILY_NOON: '0 12 * * *',
  DAILY_6PM: '0 18 * * *',
  
  // Weekly
  WEEKLY_SUNDAY_MIDNIGHT: '0 0 * * 0',
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  WEEKLY_FRIDAY_5PM: '0 17 * * 5',
  
  // Monthly
  MONTHLY_1ST_MIDNIGHT: '0 0 1 * *',
  MONTHLY_15TH_NOON: '0 12 15 * *',
  MONTHLY_LAST_DAY: '0 0 L * *',
  
  // Healthcare specific
  APPOINTMENT_REMINDER_24H: '0 9 * * *', // Daily at 9 AM
  APPOINTMENT_REMINDER_2H: '0 */2 * * *', // Every 2 hours
  LAB_RESULT_CHECK: '*/30 * * * *', // Every 30 minutes
  BILLING_DAILY: '0 2 * * *', // Daily at 2 AM
  BACKUP_WEEKLY: '0 3 * * 0', // Weekly on Sunday at 3 AM
  COMPLIANCE_MONTHLY: '0 1 1 * *', // Monthly on 1st at 1 AM
} as const

// Utility functions
export function createCronExpression(
  minute: string = '*',
  hour: string = '*',
  dayOfMonth: string = '*',
  month: string = '*',
  dayOfWeek: string = '*'
): string {
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`
}

export function parseCronExpression(expression: string): {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
} {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new BackgroundJobsError(
      'Invalid cron expression format. Expected 5 parts: minute hour dayOfMonth month dayOfWeek',
      'INVALID_CRON_FORMAT'
    )
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4]
  }
}

export function getNextNRuns(expression: string, count: number = 5, timezone?: string): Date[] {
  try {
    const options = timezone ? { tz: timezone } : {}
    const interval = cronParser.parse(expression, options)
    
    const runs: Date[] = []
    for (let i = 0; i < count; i++) {
      runs.push(interval.next().toDate())
    }
    
    return runs
  } catch (error) {
    throw new BackgroundJobsError(
      `Failed to calculate next runs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CRON_CALCULATION_ERROR'
    )
  }
}