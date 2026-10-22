variable "region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "uploads_bucket_name" {
  description = "Private S3 bucket for application uploads; import it into Terraform state if it already exists"
  type        = string
  default     = "smartedu-cloud-storage-2026"
}

variable "name" {
  description = "Base resource prefix name"
  type        = string
  default     = "smartedu"
}

variable "environment" {
  description = "Environment tier (staging, production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Custom root or subdomain (e.g. smartedu.example.com)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS listener on ALB"
  type        = string
  default     = ""
}

variable "db_instance_class" {
  description = "RDS PostgreSQL DB instance type"
  type        = string
  default     = "db.m6g.large"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.medium"
}

variable "backend_cpu" {
  description = "Fargate CPU units for API backend task"
  type        = number
  default     = 1024
}

variable "backend_memory" {
  description = "Fargate memory MB for API backend task"
  type        = number
  default     = 2048
}

variable "backend_desired_count" {
  description = "Initial replica count for backend ECS service"
  type        = number
  default     = 2
}

variable "backend_min_count" {
  description = "Minimum replica count for auto-scaling"
  type        = number
  default     = 2
}

variable "backend_max_count" {
  description = "Maximum replica count for auto-scaling during exam peaks"
  type        = number
  default     = 10
}

variable "frontend_cpu" {
  description = "Fargate CPU units for Next.js frontend task"
  type        = number
  default     = 512
}

variable "frontend_memory" {
  description = "Fargate memory MB for Next.js frontend task"
  type        = number
  default     = 1024
}

variable "frontend_desired_count" {
  description = "Initial replica count for frontend ECS service"
  type        = number
  default     = 2
}

variable "frontend_min_count" {
  description = "Minimum replica count for frontend auto-scaling"
  type        = number
  default     = 2
}

variable "frontend_max_count" {
  description = "Maximum replica count for frontend auto-scaling"
  type        = number
  default     = 6
}
