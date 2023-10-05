resource "aws_iam_policy" "iam_hunters_policy" {
    name = var.policy_name
    description = "Hunters IAM Policy"
    policy = templatefile("${path.module}/templates/hunters_policy.json",{bucket_names = var.bucket_names, kms_arns = var.kms_arns})
}

resource "aws_iam_role" "iam_hunters_role" {
    name = var.role_name
    assume_role_policy = templatefile("${path.module}/templates/hunters_role.json",{hunters_account_id = var.hunters_account_id, hunters_external_id = var.hunters_external_id})
    managed_policy_arns = [aws_iam_policy.iam_hunters_policy.arn]
}