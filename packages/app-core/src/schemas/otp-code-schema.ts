import { z } from 'zod';
import { OTP_LENGTH } from '../config.ts';

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`));
