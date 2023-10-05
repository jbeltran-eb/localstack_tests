# Input variables
locals {
    # aws_region            = "eu-west-1"
    # buckets               = ["test_bucket1"]
    # role_name             = "test_role"
    # policy_name           = "test_policy"
    # hunters_account_id    = "arn:aws:iam::111111111111:root"
    # hunters_external_id   = "11111111-2222-3333-4444-555555555555"

    aws_region            = "us-east-1"
    buckets               = ["edr-logs-central-903958141776"]
    role_name             = "hunters-integration-role-9ceff7e8"
    policy_name           = "hunters-integration-policy-9ceff7e8"
    hunters_account_id    = "685648138888"
    hunters_external_id   = "9c7779b2-4bf8-4d04-9ec8-67186102afc1"

}



# Versions and providers
#terraform {
#    required_version = "~> 1"
#
#    required_providers {
#        aws = {
#            source  = "hashicorp/aws"
#            version = "~>4"
#        }
#    }
#}

#provider "aws" {
#    region = local.aws_region
#}

# Modules implementation
module "hunters_module" {
    source = "../"

    bucket_names        = local.buckets
    region              = local.aws_region
    role_name           = local.role_name
    policy_name         = local.policy_name
    hunters_account_id  = local.hunters_account_id
    hunters_external_id = local.hunters_external_id

}