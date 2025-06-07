import { z } from 'zod'

// Client validation schema
export const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  mobile: z.string().regex(/^[\d\-\s\+\(\)]+$/, "Invalid mobile number format").optional().or(z.literal(""))
})

// Staff validation schema
export const staffSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal(""))
})

// Service validation schema
export const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional().or(z.literal("")),
  duration: z.number().min(5, "Duration must be at least 5 minutes").max(480, "Duration cannot exceed 8 hours"),
  cost: z.string().regex(/^\d*\.?\d*$/, "Invalid cost format").optional().or(z.literal(""))
})

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional()
})

// Booking validation schema
export const bookingSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required")
})

// Business rules validation
export const businessRuleSchema = z.object({
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
}).refine(data => data.start_time < data.end_time, {
  message: "End time must be after start time",
  path: ["end_time"]
})

// Helper function to validate and get formatted errors
export function validateSchema(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = {}
    result.error.errors.forEach(error => {
      errors[error.path[0]] = error.message
    })
    return { success: false, errors }
  }
  return { success: true, data: result.data }
}