variable role_name{
    description = "Name of a role to be created to grant access to S3 to Hunters" 
    type = string
}
variable "region" {
    description = "AWS Region where apply changes"
    type = string
}

variable "policy_name" {
    description = "Name of a policy to be created to grant access to S3 to Hunters"
    type = string
}

variable "bucket_names" {
    description = "List of bucket names"
    type = list(string)
}

variable "kms_arns" {
    description = "Optional list of Kms ARNs"
    type = list(string)
    default = []
}

variable "hunters_account_id" {
    description = "Hunters Account ID (as provided to you by Hunters)"
    type = string
}

variable "hunters_external_id" {
    description = "External ID generated for you by Hunters"
    type = string
}   