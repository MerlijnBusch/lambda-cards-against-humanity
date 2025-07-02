provider "aws" {
    region                      = "eu-central-1"
    access_key                  = "test"
    secret_key                  = "test"
    skip_credentials_validation = true
    skip_requesting_account_id = true

    endpoints {
        iam          = "http://localhost:4566"
        apigatewayv2 = "http://localhost:4566"
        lambda       = "http://localhost:4566"
        apigateway   = "http://localhost:4566"
        dynamodb     = "http://localhost:4566"
        logs         = "http://localhost:4566"
    }
  }