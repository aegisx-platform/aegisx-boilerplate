import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Data already cleared in 001_users.ts seed
  // We only need to insert new data here
  
  // Only clear templates and statistics (these don't have foreign key dependencies)
  await knex('notification_statistics').del();
  await knex('notification_templates').del();

  // เพิ่ม notification templates
  await knex('notification_templates').insert([
    {
      id: 'tmpl_welcome_email',
      name: 'welcome-email',
      type: 'welcome',
      channels: JSON.stringify(['email']),
      subject: 'ยินดีต้อนรับสู่ AegisX Healthcare',
      content_text: 'สวัสดี {{name}} ยินดีต้อนรับสู่ระบบ AegisX Healthcare',
      content_html: '<h1>สวัสดี {{name}}</h1><p>ยินดีต้อนรับสู่ระบบ AegisX Healthcare</p>',
      variables: JSON.stringify([
        { name: 'name', type: 'string', required: true, description: 'ชื่อผู้ใช้' }
      ]),
      created_by: 'system'
    },
    {
      id: 'tmpl_appointment_reminder',
      name: 'appointment-reminder',
      type: 'appointment-reminder',
      channels: JSON.stringify(['email', 'sms']),
      subject: 'เตือนนัดหมายแพทย์ - {{appointmentDate}}',
      content_text: 'เรียน {{patientName}} คุณมีนัดหมายกับ {{doctorName}} แผนก{{department}} วันที่ {{appointmentDate}}',
      content_html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>เตือนนัดหมายแพทย์</h2>
          <p>เรียน <strong>{{patientName}}</strong></p>
          <p>คุณมีนัดหมายกับ <strong>{{doctorName}}</strong></p>
          <p>แผนก: <strong>{{department}}</strong></p>
          <p>วันที่: <strong>{{appointmentDate}}</strong></p>
          <p>เวลา: <strong>{{appointmentTime}}</strong></p>
          <p>กรุณามาถึงก่อนเวลานัด 15 นาที</p>
        </div>
      `,
      variables: JSON.stringify([
        { name: 'patientName', type: 'string', required: true, description: 'ชื่อผู้ป่วย' },
        { name: 'doctorName', type: 'string', required: true, description: 'ชื่อแพทย์' },
        { name: 'department', type: 'string', required: true, description: 'แผนก' },
        { name: 'appointmentDate', type: 'string', required: true, description: 'วันที่นัด' },
        { name: 'appointmentTime', type: 'string', required: true, description: 'เวลานัด' }
      ]),
      created_by: 'system'
    },
    {
      id: 'tmpl_lab_results',
      name: 'lab-results-notification',
      type: 'lab-results',
      channels: JSON.stringify(['email']),
      subject: 'ผลการตรวจแลป - {{testType}}',
      content_text: 'เรียน {{patientName}} ผลการตรวจ {{testType}} ออกแล้ว กรุณาติดต่อแพทย์',
      content_html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>ผลการตรวจแลป</h2>
          <p>เรียน <strong>{{patientName}}</strong></p>
          <p>ผลการตรวจ <strong>{{testType}}</strong> ออกแล้ว</p>
          {{#if urgent}}
          <div style="background: #ffebee; padding: 10px; border-left: 4px solid #f44336;">
            <strong>⚠️ ด่วน: กรุณาติดต่อแพทย์โดยเร็ว</strong>
          </div>
          {{/if}}
          <p>กรุณาติดต่อแพทย์เพื่อรับทราบผลและรับคำแนะนำ</p>
        </div>
      `,
      variables: JSON.stringify([
        { name: 'patientName', type: 'string', required: true, description: 'ชื่อผู้ป่วย' },
        { name: 'testType', type: 'string', required: true, description: 'ประเภทการตรวจ' },
        { name: 'urgent', type: 'boolean', required: false, description: 'ด่วนหรือไม่' }
      ]),
      created_by: 'system'
    },
    {
      id: 'tmpl_prescription_ready',
      name: 'prescription-ready',
      type: 'prescription-ready',
      channels: JSON.stringify(['sms', 'email']),
      subject: 'ยาพร้อมรับ - {{prescriptionId}}',
      content_text: 'เรียน {{patientName}} ยาใบสั่งที่ {{prescriptionId}} พร้อมรับแล้ว กรุณามารับภายใน 7 วัน',
      content_html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>ยาพร้อมรับ</h2>
          <p>เรียน <strong>{{patientName}}</strong></p>
          <p>ยาใบสั่งที่ <strong>{{prescriptionId}}</strong> พร้อมรับแล้ว</p>
          <p>กรุณามารับที่เคาน์เตอร์ยา ภายใน 7 วัน</p>
          <p><strong>ค่ายา:</strong> {{totalAmount}} บาท</p>
        </div>
      `,
      variables: JSON.stringify([
        { name: 'patientName', type: 'string', required: true, description: 'ชื่อผู้ป่วย' },
        { name: 'prescriptionId', type: 'string', required: true, description: 'เลขใบสั่งยา' },
        { name: 'totalAmount', type: 'number', required: false, description: 'ค่ายารวม' }
      ]),
      created_by: 'system'
    },
    {
      id: 'tmpl_emergency',
      name: 'emergency-notification',
      type: 'emergency',
      channels: JSON.stringify(['email', 'sms', 'slack']),
      subject: '🚨 แจ้งเตือนฉุกเฉิน - {{emergencyType}}',
      content_text: 'ฉุกเฉิน! {{emergencyType}} ผู้ป่วย {{patientId}} สถานที่: {{location}}',
      content_html: `
        <div style="font-family: Arial, sans-serif; background: #ffebee; padding: 20px; border: 2px solid #f44336;">
          <h1 style="color: #d32f2f;">🚨 แจ้งเตือนฉุกเฉิน</h1>
          <p><strong>ประเภท:</strong> {{emergencyType}}</p>
          <p><strong>ผู้ป่วย:</strong> {{patientId}}</p>
          <p><strong>สถานที่:</strong> {{location}}</p>
          <p><strong>เวลา:</strong> {{timestamp}}</p>
          <p><strong>รายละเอียด:</strong> {{description}}</p>
        </div>
      `,
      variables: JSON.stringify([
        { name: 'emergencyType', type: 'string', required: true, description: 'ประเภทฉุกเฉิน' },
        { name: 'patientId', type: 'string', required: true, description: 'รหัสผู้ป่วย' },
        { name: 'location', type: 'string', required: true, description: 'สถานที่' },
        { name: 'timestamp', type: 'string', required: true, description: 'เวลาเกิดเหตุ' },
        { name: 'description', type: 'string', required: false, description: 'รายละเอียดเพิ่มเติม' }
      ]),
      created_by: 'system'
    }
  ]);

  // เพิ่ม notification preferences สำหรับ user ตัวอย่าง
  await knex('notification_preferences').insert([
    {
      user_id: 'user123',
      channels: JSON.stringify(['email', 'sms']),
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'Asia/Bangkok',
      immediate: true,
      digest: false,
      digest_interval: 'daily',
      type_preferences: JSON.stringify({
        'appointment-reminder': { enabled: true, channels: ['email', 'sms'] },
        'lab-results': { enabled: true, channels: ['email'] },
        'prescription-ready': { enabled: true, channels: ['sms'] },
        'emergency': { enabled: true, channels: ['email', 'sms'] }
      })
    },
    {
      user_id: 'doctor456',
      channels: JSON.stringify(['email', 'slack']),
      quiet_hours_start: null,
      quiet_hours_end: null,
      timezone: 'Asia/Bangkok',
      immediate: true,
      digest: true,
      digest_interval: 'hourly',
      type_preferences: JSON.stringify({
        'lab-results': { enabled: true, channels: ['email', 'slack'] },
        'emergency': { enabled: true, channels: ['email', 'sms', 'slack'] }
      })
    }
  ]);

  // เพิ่มข้อมูลตัวอย่าง notifications
  const notifications = [
    {
      id: 'notif_001',
      type: 'appointment-reminder',
      channel: 'email',
      status: 'sent',
      priority: 'high',
      recipient_id: 'user123',
      recipient_email: 'patient@example.com',
      subject: 'เตือนนัดหมายแพทย์ - 15 ม.ค. 2024',
      content_text: 'เรียน คุณสมชาย คุณมีนัดหมายกับ นพ.สมหญิง แผนกหัวใจ วันที่ 15 ม.ค. 2024',
      template_name: 'appointment-reminder',
      template_data: JSON.stringify({
        patientName: 'คุณสมชาย',
        doctorName: 'นพ.สมหญิง',
        department: 'หัวใจ',
        appointmentDate: '15 มกราคม 2024',
        appointmentTime: '14:00'
      }),
      metadata: JSON.stringify({
        healthcare: {
          patientId: 'P12345',
          providerId: 'DR001',
          appointmentId: 'APT789',
          department: 'cardiology',
          urgency: 'medium',
          hipaaCompliant: true
        }
      }),
      tags: JSON.stringify(['healthcare', 'appointment', 'reminder']),
      attempts: 1,
      max_attempts: 3,
      sent_at: new Date(Date.now() - 3600000), // 1 hour ago
      created_by: 'system'
    },
    {
      id: 'notif_002',
      type: 'lab-results',
      channel: 'email',
      status: 'delivered',
      priority: 'urgent',
      recipient_id: 'user123',
      recipient_email: 'patient@example.com',
      subject: 'ผลการตรวจแลป - ตรวจเลือด',
      template_name: 'lab-results-notification',
      template_data: JSON.stringify({
        patientName: 'คุณสมชาย',
        testType: 'ตรวจเลือด',
        urgent: true
      }),
      metadata: JSON.stringify({
        healthcare: {
          patientId: 'P12345',
          providerId: 'DR001',
          urgency: 'high',
          hipaaCompliant: true,
          encryption: { enabled: true }
        }
      }),
      tags: JSON.stringify(['healthcare', 'lab-results', 'urgent']),
      attempts: 1,
      max_attempts: 3,
      sent_at: new Date(Date.now() - 1800000), // 30 minutes ago
      delivered_at: new Date(Date.now() - 1700000), // 28 minutes ago
      created_by: 'system'
    },
    {
      id: 'notif_003',
      type: 'prescription-ready',
      channel: 'sms',
      status: 'queued',
      priority: 'normal',
      recipient_id: 'user123',
      recipient_phone: '+66812345678',
      content_text: 'เรียน คุณสมชาย ยาใบสั่งที่ RX789 พร้อมรับแล้ว กรุณามารับภายใน 7 วัน',
      template_name: 'prescription-ready',
      template_data: JSON.stringify({
        patientName: 'คุณสมชาย',
        prescriptionId: 'RX789',
        totalAmount: 350
      }),
      metadata: JSON.stringify({
        healthcare: {
          patientId: 'P12345',
          urgency: 'low',
          hipaaCompliant: true
        }
      }),
      tags: JSON.stringify(['healthcare', 'prescription']),
      attempts: 0,
      max_attempts: 3,
      scheduled_at: new Date(Date.now() + 1800000), // 30 minutes from now
      created_by: 'system'
    }
  ];

  await knex('notifications').insert(notifications);

  // เพิ่มข้อมูล healthcare_notifications
  await knex('healthcare_notifications').insert([
    {
      notification_id: 'notif_001',
      patient_id: 'P12345',
      provider_id: 'DR001',
      appointment_id: 'APT789',
      facility_id: 'HOSP001',
      department: 'cardiology',
      urgency: 'medium',
      hipaa_compliant: true,
      encryption_enabled: false
    },
    {
      notification_id: 'notif_002',
      patient_id: 'P12345',
      provider_id: 'DR001',
      facility_id: 'HOSP001',
      department: 'laboratory',
      urgency: 'high',
      hipaa_compliant: true,
      encryption_enabled: true,
      encryption_algorithm: 'AES-256'
    },
    {
      notification_id: 'notif_003',
      patient_id: 'P12345',
      facility_id: 'HOSP001',
      department: 'pharmacy',
      urgency: 'low',
      hipaa_compliant: true,
      encryption_enabled: false
    }
  ]);

  // เพิ่ม batch ตัวอย่าง
  await knex('notification_batches').insert([
    {
      id: 'batch_001',
      name: 'Daily Appointment Reminders',
      status: 'completed',
      total_count: 50,
      success_count: 48,
      failure_count: 2,
      created_at: new Date(Date.now() - 86400000), // 1 day ago
      started_at: new Date(Date.now() - 86000000),
      completed_at: new Date(Date.now() - 85000000),
      created_by: 'system'
    }
  ]);

  // เพิ่มสถิติ
  await knex('notification_statistics').insert([
    {
      metric_name: 'sent',
      channel: 'email',
      type: 'appointment-reminder',
      priority: 'high',
      count: 120,
      average_delivery_time: 2500.50,
      error_rate: 2.5,
      date: new Date().toISOString().split('T')[0]
    },
    {
      metric_name: 'delivered',
      channel: 'email',
      type: 'appointment-reminder', 
      priority: 'high',
      count: 117,
      average_delivery_time: 2800.75,
      error_rate: 2.5,
      date: new Date().toISOString().split('T')[0]
    },
    {
      metric_name: 'sent',
      channel: 'sms',
      type: 'prescription-ready',
      priority: 'normal',
      count: 85,
      average_delivery_time: 1200.25,
      error_rate: 1.2,
      date: new Date().toISOString().split('T')[0]
    }
  ]);
}