import { Type } from '@sinclair/typebox';

export const IdSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
});

export const UUID = Type.String({ format: 'uuid' });
export const DateRange = Type.Object({
  from: Type.String({ format: 'date-time' }),
  to: Type.String({ format: 'date-time' }),
});
