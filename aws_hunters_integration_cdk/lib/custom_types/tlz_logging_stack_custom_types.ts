export type TLZLoggingStackS3AndSNSContextParamType = {
    /**
     * Base Name for the S3 Bucket where the logs will be storage.
     */
    BucketBaseName: string,
    /**
     * Base Name for the SNS Topic associated to the Bucket for logs.
     */
    BucketSNSTopicBaseName: string,
    /**
     * Flag indicating if AWS SNS Topic should be created in the stack.
     */
    CreateSNSTopic: boolean,
    /**
     * Flag indicating if AWS S3 Buckets should be created in the stack.
     */
    CreateBucket: boolean,
    /**
     * Flag Indicating if AWS S3 Event Notification SNS should be created.
     * (Unfortunately CDK doesn't support import it)
     */
    EnableS3SNSEventNotification: boolean,
}

export type TLZLoggingStackSQSAndProductContextParamType = {
    /**
     * AWS Account Id for indicated Product.
     */
    AccountId: string,
    /**
     * External Id for indicated Product.
     */
    ExternalId: string,
    /**
     * ARNs for the KMS to use with indicated Product.
     */
    KmsArns: string,
    /**
     * AWS Iam Policy Name used with the S3 Bucket where Cloud Trail storage logs 
     * and the indicated product integrate with.
     */
    CloudTrailBucketAccessIamPolicyName: string,
    /**
     * AWS Iam Role Name associated with Hunters.
     */
    RoleName: string,
    /**
     * Flag indicating if the corresponding SQS Queue should be created.
     * (If not created it should be imported from existing one)
     */
    CreateSQSQueue: boolean,
    /**
     * Name for the AWS Queue to create
     */
    QueueName: string,
    /**
     * ARN for the AWS Queue to import
     * (Only usable during import the resource)
     */
    QueueARN: string
}

export type TLZLoggingStackContextParamType = {
    /**
     * AWS Account ID where components are deployed.
     */
    MainAWSAccount: string,
    /**
     * AWS Region where components are deployed.
     */
    MainAWSRegion: string,
    /**
     * Values required for the configuration of Cloudtrail S3 Bucket for logs and SNS Topics.
     */
    CloudTrail: TLZLoggingStackS3AndSNSContextParamType,
    /**
     * Values required for the configuration of Hunters integration
     */
    Hunters: TLZLoggingStackSQSAndProductContextParamType,
    /**
     * Values required for the configuration of Wiz integration
     */
    Wiz: TLZLoggingStackSQSAndProductContextParamType,
};

// [DEPRECATED]
// // Cloudtrail Context Params SubType:
// export type TLZLoggingStackContextCloudtrailParamType = Pick<TLZLoggingStackContextParamType, 'CloudTrail'>;

// // Hunters Context Params SubType:
// export type TLZLoggingStackContextHuntersParamType = Pick<TLZLoggingStackContextParamType, 'Hunters'>;

// //Wiz Context Params SubType:
// export type TLZLoggingStackContextWizParamType = Pick<TLZLoggingStackContextParamType,'Wiz'>;
