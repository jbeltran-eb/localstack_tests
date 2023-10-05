resource "aws_s3_bucket" "test-bucket" {
  bucket = "my-test-bucket"
  
  tags = {
    Name        = "My bucket test"
    Environment = "Dev"
  }
}
