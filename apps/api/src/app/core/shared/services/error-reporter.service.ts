/**
 * Error Reporter Service
 * 
 * Service for delivering error reports and alerts through various channels
 * with healthcare compliance and notification management
 */

import { EventEmitter } from 'events'
// import nodemailer from 'nodemailer'
import axios from 'axios'
import {
  IErrorReporter,
  ErrorReport,
  ErrorAlert,
  ReportChannel,
  EmailConfig,
  ExternalService,
  SentryConfig,
  DatadogConfig,
  NewRelicConfig,
  AlertAction,
  ErrorSeverity
} from '../types/error-tracker.types'

export class ErrorReporterService extends EventEmitter implements IErrorReporter {
  private emailTransporter?: any // nodemailer.Transporter
  private integrations: Map<string, ExternalService> = new Map()
  private alertCooldowns: Map<string, Date> = new Map()

  constructor() {
    super()
  }

  /**
   * Send error report through specified channels
   */
  async sendReport(report: ErrorReport, channels: ReportChannel[]): Promise<void> {
    const deliveryPromises: Promise<void>[] = []

    for (const channel of channels) {
      switch (channel) {
        case 'email':
          deliveryPromises.push(this.sendReportByEmail(report))
          break
        case 'slack':
          deliveryPromises.push(this.sendReportToSlack(report))
          break
        case 'webhook':
          deliveryPromises.push(this.sendReportToWebhook(report))
          break
        case 'file':
          deliveryPromises.push(this.saveReportToFile(report))
          break
        case 'database':
          deliveryPromises.push(this.saveReportToDatabase(report))
          break
      }
    }

    try {
      await Promise.allSettled(deliveryPromises)
      this.emit('report-delivered', { reportId: report.id, channels })
    } catch (error) {
      this.emit('report-delivery-failed', { 
        reportId: report.id, 
        channels, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Send error alert
   */
  async sendAlert(alert: ErrorAlert): Promise<void> {
    // Check cooldown
    if (this.isInCooldown(alert)) {
      return
    }

    const deliveryPromises: Promise<void>[] = []

    for (const channel of alert.channels) {
      switch (channel) {
        case 'email':
          deliveryPromises.push(this.sendAlertByEmail(alert))
          break
        case 'slack':
          deliveryPromises.push(this.sendAlertToSlack(alert))
          break
        case 'sms':
          deliveryPromises.push(this.sendAlertBySms(alert))
          break
        case 'webhook':
          deliveryPromises.push(this.sendAlertToWebhook(alert))
          break
        case 'pagerduty':
          deliveryPromises.push(this.sendAlertToPagerDuty(alert))
          break
        case 'discord':
          deliveryPromises.push(this.sendAlertToDiscord(alert))
          break
      }
    }

    try {
      await Promise.allSettled(deliveryPromises)
      
      // Set cooldown
      this.setCooldown(alert)
      
      // Execute additional actions
      if (alert.actions) {
        await this.executeAlertActions(alert.actions)
      }

      this.emit('alert-delivered', { alertId: alert.id, channels: alert.channels })
    } catch (error) {
      this.emit('alert-delivery-failed', { 
        alertId: alert.id, 
        channels: alert.channels, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Integrate with external service
   */
  integrateWith(service: ExternalService): void {
    this.integrations.set(service.name, service)
    
    // Setup service-specific integrations
    switch (service.type) {
      case 'monitoring':
        this.setupMonitoringIntegration(service)
        break
      case 'logging':
        this.setupLoggingIntegration(service)
        break
      case 'alerting':
        this.setupAlertingIntegration(service)
        break
      case 'ticketing':
        this.setupTicketingIntegration(service)
        break
    }

    this.emit('integration-added', { serviceName: service.name, type: service.type })
  }

  /**
   * Configure email transport
   */
  configureEmail(config: EmailConfig): void {
    // this.emailTransporter = nodemailer.createTransporter(config.smtp)
    console.log('Email configuration received:', config)
    this.emit('email-configured')
  }

  // Private methods for report delivery

  private async sendReportByEmail(report: ErrorReport): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email not configured')
    }

    const html = this.generateReportHTML(report)
    const attachments = report.attachments?.map(att => ({
      filename: att.name,
      content: att.data,
      contentType: this.getContentType(att.type)
    })) || []

    await this.emailTransporter.sendMail({
      from: process.env.ERROR_REPORT_FROM_EMAIL,
      to: process.env.ERROR_REPORT_TO_EMAIL,
      subject: `Error Report: ${report.title}`,
      html,
      attachments
    })
  }

  private async sendReportToSlack(report: ErrorReport): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured')
    }

    const slackMessage = this.formatReportForSlack(report)
    
    await axios.post(webhookUrl, slackMessage, {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async sendReportToWebhook(report: ErrorReport): Promise<void> {
    const webhookUrl = process.env.ERROR_REPORT_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Webhook URL not configured')
    }

    await axios.post(webhookUrl, {
      type: 'error_report',
      report,
      timestamp: new Date().toISOString()
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async saveReportToFile(report: ErrorReport): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const reportsDir = process.env.ERROR_REPORTS_DIR || './reports'
    await fs.mkdir(reportsDir, { recursive: true })
    
    const filename = `error-report-${report.id}-${new Date().toISOString().split('T')[0]}.json`
    const filepath = path.join(reportsDir, filename)
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2))
  }

  private async saveReportToDatabase(report: ErrorReport): Promise<void> {
    // This would integrate with the database service
    // For now, we'll emit an event that can be handled by the database layer
    this.emit('save-report-to-database', { report })
  }

  // Private methods for alert delivery

  private async sendAlertByEmail(alert: ErrorAlert): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email not configured')
    }

    const html = this.generateAlertHTML(alert)
    
    await this.emailTransporter.sendMail({
      from: process.env.ERROR_ALERT_FROM_EMAIL,
      to: process.env.ERROR_ALERT_TO_EMAIL,
      subject: `🚨 ${alert.title}`,
      html,
      priority: alert.severity === 'critical' ? 'high' : 'normal'
    })
  }

  private async sendAlertToSlack(alert: ErrorAlert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured')
    }

    const slackMessage = this.formatAlertForSlack(alert)
    
    await axios.post(webhookUrl, slackMessage, {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async sendAlertBySms(alert: ErrorAlert): Promise<void> {
    // This would integrate with an SMS service like Twilio
    // For now, we'll log the alert
    console.log(`SMS Alert: ${alert.title} - ${alert.message}`)
    this.emit('sms-alert-sent', { alertId: alert.id })
  }

  private async sendAlertToWebhook(alert: ErrorAlert): Promise<void> {
    const webhookUrl = process.env.ERROR_ALERT_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Alert webhook URL not configured')
    }

    await axios.post(webhookUrl, {
      type: 'error_alert',
      alert,
      timestamp: new Date().toISOString()
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async sendAlertToPagerDuty(alert: ErrorAlert): Promise<void> {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY
    if (!routingKey) {
      throw new Error('PagerDuty routing key not configured')
    }

    await axios.post('https://events.pagerduty.com/v2/enqueue', {
      routing_key: routingKey,
      event_action: 'trigger',
      payload: {
        summary: alert.title,
        source: 'aegisx-error-tracker',
        severity: this.mapSeverityToPagerDuty(alert.severity),
        custom_details: {
          message: alert.message,
          errorCount: alert.errors.length,
          threshold: alert.threshold
        }
      }
    })
  }

  private async sendAlertToDiscord(alert: ErrorAlert): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured')
    }

    const discordMessage = this.formatAlertForDiscord(alert)
    
    await axios.post(webhookUrl, discordMessage, {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Alert action execution

  private async executeAlertActions(actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.executeEmailAction(action)
            break
          case 'sms':
            await this.executeSmsAction(action)
            break
          case 'webhook':
            await this.executeWebhookAction(action)
            break
          case 'ticket':
            await this.executeTicketAction(action)
            break
          case 'runbook':
            await this.executeRunbookAction(action)
            break
        }
      } catch (error) {
        this.emit('action-execution-failed', { 
          action, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  private async executeEmailAction(action: AlertAction): Promise<void> {
    if (!this.emailTransporter) return
    
    await this.emailTransporter.sendMail({
      from: process.env.ERROR_ALERT_FROM_EMAIL,
      to: action.target,
      subject: 'Alert Action Required',
      html: `<p>Action required: ${JSON.stringify(action.payload)}</p>`
    })
  }

  private async executeSmsAction(action: AlertAction): Promise<void> {
    // SMS action implementation
    console.log(`SMS Action to ${action.target}:`, action.payload)
  }

  private async executeWebhookAction(action: AlertAction): Promise<void> {
    await axios.post(action.target, action.payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private async executeTicketAction(action: AlertAction): Promise<void> {
    // Ticket creation implementation
    this.emit('create-ticket', { target: action.target, payload: action.payload })
  }

  private async executeRunbookAction(action: AlertAction): Promise<void> {
    // Runbook execution implementation
    this.emit('execute-runbook', { target: action.target, payload: action.payload })
  }

  // Integration setup methods

  private setupMonitoringIntegration(service: ExternalService): void {
    if (service.name === 'datadog') {
      // Setup Datadog integration
      this.setupDatadogIntegration(service.config as DatadogConfig)
    } else if (service.name === 'newrelic') {
      // Setup New Relic integration
      this.setupNewRelicIntegration(service.config as NewRelicConfig)
    }
  }

  private setupLoggingIntegration(service: ExternalService): void {
    if (service.name === 'sentry') {
      // Setup Sentry integration
      this.setupSentryIntegration(service.config as SentryConfig)
    }
  }

  private setupAlertingIntegration(service: ExternalService): void {
    // Setup alerting service integration
    this.emit('alerting-integration-setup', service)
  }

  private setupTicketingIntegration(service: ExternalService): void {
    // Setup ticketing service integration
    this.emit('ticketing-integration-setup', service)
  }

  private setupSentryIntegration(config: SentryConfig): void {
    // Sentry integration setup
    this.emit('sentry-integration-ready', config)
  }

  private setupDatadogIntegration(config: DatadogConfig): void {
    // Datadog integration setup
    this.emit('datadog-integration-ready', config)
  }

  private setupNewRelicIntegration(config: NewRelicConfig): void {
    // New Relic integration setup
    this.emit('newrelic-integration-ready', config)
  }

  // Utility methods

  private isInCooldown(alert: ErrorAlert): boolean {
    const cooldownKey = this.generateCooldownKey(alert)
    const lastAlert = this.alertCooldowns.get(cooldownKey)
    
    if (!lastAlert) return false
    
    const cooldownPeriod = this.getCooldownPeriod(alert.severity)
    return (Date.now() - lastAlert.getTime()) < cooldownPeriod
  }

  private setCooldown(alert: ErrorAlert): void {
    const cooldownKey = this.generateCooldownKey(alert)
    this.alertCooldowns.set(cooldownKey, new Date())
  }

  private generateCooldownKey(alert: ErrorAlert): string {
    return `${alert.type}-${alert.threshold.metric}`
  }

  private getCooldownPeriod(severity: ErrorSeverity): number {
    const periods = {
      low: 30 * 60 * 1000,      // 30 minutes
      medium: 15 * 60 * 1000,   // 15 minutes
      high: 5 * 60 * 1000,      // 5 minutes
      critical: 2 * 60 * 1000   // 2 minutes
    }
    return periods[severity]
  }

  // Message formatting methods

  private generateReportHTML(report: ErrorReport): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
            .summary { margin: 20px 0; }
            .metric { display: inline-block; margin: 10px; padding: 10px; background-color: #e9ecef; border-radius: 3px; }
            .error-list { margin-top: 20px; }
            .error-item { padding: 10px; border-left: 3px solid #dc3545; margin: 10px 0; background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${report.title}</h1>
            <p>Generated: ${report.generatedAt.toISOString()}</p>
            <p>Period: ${report.timeframe.start.toISOString()} to ${report.timeframe.end.toISOString()}</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <div class="metric">Total Errors: ${report.summary.totalErrors}</div>
            <div class="metric">Unique Errors: ${report.summary.uniqueErrors}</div>
            <div class="metric">Error Rate: ${report.summary.errorRate.toFixed(2)}/min</div>
            <div class="metric">Critical Issues: ${report.summary.criticalIssues}</div>
          </div>
          
          <div class="error-list">
            <h2>Top Errors</h2>
            ${report.details.topErrors.slice(0, 5).map(error => `
              <div class="error-item">
                <strong>${error.error.name}</strong><br>
                <em>${error.error.message}</em><br>
                Count: ${error.count} | Severity: ${error.error.severity}
              </div>
            `).join('')}
          </div>
          
          ${report.recommendations.length > 0 ? `
            <div>
              <h2>Recommendations</h2>
              <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </body>
      </html>
    `
  }

  private formatReportForSlack(report: ErrorReport): any {
    return {
      text: `Error Report: ${report.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: report.title
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Errors:* ${report.summary.totalErrors}`
            },
            {
              type: 'mrkdwn',
              text: `*Error Rate:* ${report.summary.errorRate.toFixed(2)}/min`
            },
            {
              type: 'mrkdwn',
              text: `*Critical Issues:* ${report.summary.criticalIssues}`
            },
            {
              type: 'mrkdwn',
              text: `*Period:* ${report.timeframe.start.toISOString().split('T')[0]} to ${report.timeframe.end.toISOString().split('T')[0]}`
            }
          ]
        }
      ]
    }
  }

  private generateAlertHTML(alert: ErrorAlert): string {
    const severityColor = this.getSeverityColor(alert.severity)
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="padding: 20px; border-left: 5px solid ${severityColor}; background-color: #f8f9fa;">
            <h1 style="color: ${severityColor};">${alert.title}</h1>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            
            <h3>Threshold Details</h3>
            <p><strong>Metric:</strong> ${alert.threshold.metric}</p>
            <p><strong>Threshold:</strong> ${alert.threshold.value}</p>
            <p><strong>Actual:</strong> ${alert.threshold.actual}</p>
            
            <h3>Affected Errors (${alert.errors.length})</h3>
            ${alert.errors.slice(0, 3).map(error => `
              <div style="margin: 10px 0; padding: 10px; background-color: #fff; border-radius: 3px;">
                <strong>${error.error.name}</strong><br>
                <em>${error.error.message}</em>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `
  }

  private formatAlertForSlack(alert: ErrorAlert): any {
    const severityEmoji = this.getSeverityEmoji(alert.severity)
    
    return {
      text: `${severityEmoji} ${alert.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmoji} ${alert.title}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Severity:* ${alert.severity.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Metric:* ${alert.threshold.metric}`
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:* ${alert.threshold.value}`
            },
            {
              type: 'mrkdwn',
              text: `*Actual:* ${alert.threshold.actual}`
            }
          ]
        }
      ],
      color: this.getSeverityColor(alert.severity)
    }
  }

  private formatAlertForDiscord(alert: ErrorAlert): any {
    const severityColor = parseInt(this.getSeverityColor(alert.severity).replace('#', ''), 16)
    
    return {
      embeds: [
        {
          title: alert.title,
          description: alert.message,
          color: severityColor,
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Metric',
              value: alert.threshold.metric,
              inline: true
            },
            {
              name: 'Threshold/Actual',
              value: `${alert.threshold.value} / ${alert.threshold.actual}`,
              inline: true
            }
          ],
          timestamp: alert.timestamp.toISOString()
        }
      ]
    }
  }

  private getSeverityColor(severity: ErrorSeverity): string {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    }
    return colors[severity]
  }

  private getSeverityEmoji(severity: ErrorSeverity): string {
    const emojis = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    }
    return emojis[severity]
  }

  private mapSeverityToPagerDuty(severity: ErrorSeverity): string {
    const mapping = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'critical'
    }
    return mapping[severity]
  }

  private getContentType(type: string): string {
    const types = {
      csv: 'text/csv',
      json: 'application/json',
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    return types[type as keyof typeof types] || 'application/octet-stream'
  }
}