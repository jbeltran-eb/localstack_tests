cdklocal synth -c MainAWSAccount=000000000000 \
-c HuntersBucketBaseName=tlz-cloudtrail-central \
-c HuntersAccountId=000000000000 \
-c HuntersExternalId=9c7779b2-4bf8-4d04-9ec8-67186102afc1 \
-c HuntersKmsArns=arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab \
-c HuntersIamPolicyName=hunters-integration-policy \
-c HuntersRoleName=hunters-integration-role 