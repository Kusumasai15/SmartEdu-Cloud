# AWS deployment foundation

This directory prepares the network, private PostgreSQL database, private S3 bucket,
container registries, and ECS cluster. It does **not** deploy the application yet.
Do not run `terraform apply` until the account, region, cost, and data migration plan
have been reviewed. Terraform state must be stored in an encrypted, access-controlled
remote backend with state locking; do not commit state files.

Remaining deployment work:

1. Configure a remote Terraform backend and review `terraform plan` in the target account.
2. Provision Redis, an ALB, HTTPS certificates, Route 53 records, WAF, ECS task
   roles, task definitions, services, autoscaling policies, logs, alarms, and secret
   injection. Allow only the ALB to reach the application tasks.
3. Configure S3 CORS for the app origin and test the signed upload/download
   routes from a real browser. Files remain private; the API now returns a
   short-lived GET URL only after an authorization check.
4. Store JWT secrets and database connection details in Secrets Manager. Use ECS
   task roles for S3; never put AWS access keys in the frontend or repository.
5. Build the frontend image with the real `NEXT_PUBLIC_API_URL` build argument.
   Run Alembic migrations once as a separate ECS release task before updating
   the API service. Do not run migrations in each API replica.
6. Import institutional users and academic records. After migrations, run
   `python -m app.cli.bootstrap_admin --email <admin-email> --first-name <name>`
   once as a private ECS task. It prompts for a password and refuses to create a
   second administrator. Keep sample seeding disabled.
7. Run staging end-to-end, security, backup-restore, failover, and load tests before
   accepting 15,000-student traffic. Size ECS, RDS, Redis, and connection pools from
   measured p95 latency and error rate, not the student count alone.

No AWS credentials, account numbers, or passwords belong in these files.

The deployment defaults to region `ap-south-1` and private upload bucket
`smartedu-cloud-storage-2026`. If that bucket already exists in your account,
import it as `aws_s3_bucket.uploads` into the secured remote Terraform state
before planning; do not attempt to create another bucket with the same name.
The backend reads `AWS_REGION` and `AWS_S3_BUCKET` from its environment.
Use an ECS task role for S3 access, not the downloaded access-key CSV or PEM.
