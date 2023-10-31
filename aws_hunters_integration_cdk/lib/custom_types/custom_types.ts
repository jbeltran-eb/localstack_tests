export type custom_context_param_stack_type = {
    /**
     * AWS Account ID where components are deployed
     */
    MainAWSAccount: string,
    /**
     * Base Name for the S3 Bucket where Cloudtrail logs will be storage
     */
    CloudTrailBucketBaseName: string,
    /**
     * Account Id for Hunters Product
     */
    HuntersAccountId: string,
    /**
     * External Id for Hunters Product
     */
    HuntersExternalId: string,
    /**
     * ARNs for the KMS to use with Hunters
     */
    HuntersKmsArns: string,
    /**
     * AWS Iam Policy Name used with the S3 Bucket where Cloud Trail storage logs and Hunters integrate with
     */
    HuntersCloudTrailBucketAccessIamPolicyName: string,
    /**
     * AWS Iam Role Name associated with Hunters
     */
    HuntersRoleName: string,
    WizBucketBaseName: string,
    WizAccountId: string,
    WizExternalId: string,
    WizCloudTrailBucketAccessIamPolicyName: string,
    WizRoleName: string,
    EnableS3SNSEventNotification: boolean,
    CreateSQSQueues: boolean,
    /**
     * Flag indicating if AWS S3 Buckets should be created in the stack.
     */
    CreateListOfS3Buckets: boolean,
    CreateSNSTopics: boolean      
};
