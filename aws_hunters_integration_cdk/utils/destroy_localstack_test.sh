cdklocal destroy -c MainAWSAccount=000000000000 \
-c CloudTrailBucketBaseName=tlz-cloudtrail-central \
-c HuntersAccountId=685648138888 \
-c HuntersExternalId=9c7779b2-4bf8-4d04-9ec8-67186102afc1 \
-c HuntersKmsArns=arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab \
-c HuntersCloudTrailBucketAccessIamPolicyName=hunters-integration-policy \
-c HuntersRoleName=hunters-integration-role \
-c WizBucketBaseName=tlz-cloudtrail-central \
-c WizAccountId=197171649850 \
-c WizExternalId=7d2dd322-8576-429b-b6e7-b4bb94b48d84 \
-c WizCloudTrailBucketAccessIamPolicyName=WizCloudTrailBucketAccessPolicy \
-c WizRoleName=wiz-integration-role \
-c EnableS3SNSEventNotification=false \
-c CreateSQSQueues=true \
-c CreateListOfS3Buckets=true \
-c CreateSNSTopics=true \
-v