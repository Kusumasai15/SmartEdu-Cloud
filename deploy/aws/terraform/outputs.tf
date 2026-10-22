output "vpc_id" {
  description = "Application VPC ID"
  value       = aws_vpc.app.id
}

output "private_subnet_ids" {
  description = "Private Subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public Subnet IDs"
  value       = aws_subnet.public[*].id
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.app.dns_name
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.app.arn
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.app.name
}

output "frontend_repository_url" {
  description = "Frontend ECR Repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "backend_repository_url" {
  description = "Backend ECR Repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "upload_bucket" {
  description = "Private S3 Uploads Bucket"
  value       = aws_s3_bucket.uploads.bucket
}

output "database_endpoint" {
  description = "PostgreSQL RDS primary endpoint"
  value       = aws_db_instance.app.address
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary connection endpoint"
  value       = aws_elasticache_replication_group.app.primary_endpoint_address
}

output "secrets_manager_secret_arn" {
  description = "App Secrets Manager secret ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "migration_task_definition_arn" {
  description = "Alembic DB Migration Task Definition ARN"
  value       = aws_ecs_task_definition.migration.arn
}

output "waf_web_acl_arn" {
  description = "AWS WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.main.arn
}
