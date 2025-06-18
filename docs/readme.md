# Fastify Feature-Based Modular Plugin Architecture

แนวทางการออกแบบระบบ API ด้วย Fastify ที่เหมาะสำหรับโปรเจกต์ขนาดกลางถึงใหญ่ โดยใช้แนวคิด Modular Plugin ผสานกับแนวทาง Feature-Based Structure ภายใน `apps/api-server` โดยไม่ต้องแยกเป็น libs

---

## 📌 Concept Summary

* แบ่งโครงสร้างเป็น `core` และ `features`
* ทุก Feature เป็น Fastify Plugin (`index.ts`)
* Controller สามารถมีหลายไฟล์ใน 1 Feature
* ใช้ `@fastify/autoload` เพื่อโหลด plugin อัตโนมัติ
* เริ่มง่าย และสามารถแยก libs ทีหลังได้

---

## 🗂️ โครงสร้างโปรเจกต์

```
apps/api-server/
└── src/
    ├── main.ts
    ├── loaders/
    │   ├── register-core.ts
    │   └── register-features.ts
    ├── modules/
    │   ├── core/
    │   │   ├── db/
    │   │   ├── logger/
    │   │   └── auth/
    │   └── features/
    │       ├── user/
    │       │   ├── index.ts
    │       │   ├── controller/
    │       │   │   ├── profile.controller.ts
    │       │   │   └── account.controller.ts
    │       │   ├── service/
    │       │   └── repository/
    │       └── order/
    └── shared/
        └── utils/
```

---

## 🧹 Plugin หลักของ Feature (`index.ts`)

```ts
import { FastifyPluginAsync } from 'fastify';
import profileController from './controller/profile.controller';
import accountController from './controller/account.controller';

const userPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(profileController, { prefix: '/profile' });
  fastify.register(accountController, { prefix: '/account' });
};

export default userPlugin;
```

---

## 📆 Autoload Plugins

### register-core.ts

```ts
import autoload from '@fastify/autoload';
import { join } from 'path';

export async function registerCorePlugins(fastify) {
  await fastify.register(autoload, {
    dir: join(__dirname, '../modules/core'),
    encapsulate: false,
  });
}
```

### register-features.ts

```ts
import autoload from '@fastify/autoload';
import { join } from 'path';

export async function registerFeaturePlugins(fastify) {
  await fastify.register(autoload, {
    dir: join(__dirname, '../modules/features'),
    options: { prefix: '/api' }
  });
}
```

---

## 💡 จุดเด่นของแนวทางนี้

| จุดเด่น           | รายละเอียด                                   |
| ----------------- | -------------------------------------------- |
| ✅ เข้าใจง่าย      | ไม่ซับซ้อน เหมาะกับทีมเริ่มต้น               |
| ✅ รองรับการเติบโต | เพิ่ม features ได้โดยไม่ยุ่งกับโครงสร้างอื่น |
| ✅ Plugin-based    | ใช้จุดแข็งของ Fastify เต็มที่                |
| ✅ Test ง่าย       | แยกเทสต่อ feature หรือ controller ได้        |
| ✅ Scale ได้       | ย้ายออกเป็น lib หรือ microservice ได้ภายหลัง |

---

## 🔧 ตัวอย่าง Plugins ที่ควรใช้

| Plugin                    | หน้าที่                        |
| ------------------------- | ------------------------------ |
| `@fastify/autoload`       | โหลด plugins อัตโนมัติ         |
| `@fastify/sensible`       | เพิ่ม util เช่น `httpErrors`   |
| `@fastify/under-pressure` | ตรวจสอบโหลดระบบ/health         |
| `@fastify/swagger`        | API Documentation              |
| `@fastify/jwt`            | จัดการ auth ด้วย JWT           |
| `@fastify/env`            | ตรวจสอบ schema ของ ENV         |
| `fastify-compress`        | รองรับ gzip/brotli compression |

---

## 🥪 แนะนำการแยกเทส

* เทส controller แยกไฟล์ละ 1 describe
* เทส service แบบ unit (mock repository)
* เทส plugin ทั้ง feature แบบ integration ด้วย `fastify.inject()`

---

## 📈 ขยายระบบในอนาคต

| ความต้องการ                | วิธี                                       |
| -------------------------- | ------------------------------------------ |
| ต้องการแบ่งทีมทำ           | ย้าย feature ไปเป็น `libs/features/<name>` |
| ต้องการแยก service         | เปลี่ยน plugin เป็น microservice app       |
| ต้องการ test เฉพาะ feature | ใช้ plugin encapsulation และ DI แยก test   |

---

## ✅ ข้อเสนอแนะเพิ่มเติม

* แยกชัดเจน `controller`, `service`, `repository`
* ใช้ `schema/` สำหรับ Zod/Joi validation
* ใช้ `shared/` สำหรับ `constants`, `utils`, `types`

---

## 🏁 เหมาะกับใคร?

* ทีมที่อยากใช้ Fastify เต็มประสิทธิภาพ
* ทีม Angular ที่ต้องการ API ที่ modular
* โปรเจกต์ที่ต้องการแยก feature ชัดเจนแต่ไม่ซับซ้อนเกินไป

---

## 📌 คำแนะนำสุดท้าย

> ถ้าระบบคุณยังไม่ต้องแยก workspace หรือ team เยอะ แนวทางนี้ช่วยให้คุณพัฒนาไว, test ได้, scale ได้ภายหลัง โดยไม่ต้องลงทุนแยก libs ตั้งแต่ต้น
