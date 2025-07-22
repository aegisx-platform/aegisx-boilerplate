import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

/**
 * Configuration Management Domain Plugin
 * 
 * จัดการการเชื่อมต่อระหว่าง Configuration Management domain กับ Fastify instance
 * สำหรับใช้งาน routes และ services
 */
const configManagementPlugin: FastifyPluginAsync = async (fastify) => {
  // ไม่ต้องทำอะไรพิเศษที่นี่ เพราะ services จะถูก register ใน core plugins
  // และ routes จะถูก register ใน API layer
  
  fastify.log.info('✅ Configuration Management domain loaded');
};

export default fp(configManagementPlugin, {
  name: 'config-management-domain',
  dependencies: ['core-plugins'] // ต้องรอ core plugins โหลดเสร็จก่อน
});