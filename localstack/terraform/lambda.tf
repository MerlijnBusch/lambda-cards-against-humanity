resource "aws_iam_role" "lambda_exec_role" {
    name = "lambda-exec-role"

    assume_role_policy = jsonencode({
      Version = "2012-10-17",
      Statement = [{
        Action = "sts:AssumeRole",
        Principal = {
          Service = "lambda.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      }]
    })
  }

  resource "aws_lambda_function" "connect" {
    function_name    = "ConnectHandler"
    handler          = "app.handler"
    runtime          = "nodejs18.x"
    role             = aws_iam_role.lambda_exec_role.arn
    filename         = "${path.module}/../../output/connect.zip"
    source_code_hash = filebase64sha256("${path.module}/../../output/connect.zip")
  }

  resource "aws_lambda_function" "disconnect" {
    function_name    = "DisconnectHandler"
    handler          = "app.handler"
    runtime          = "nodejs18.x"
    role             = aws_iam_role.lambda_exec_role.arn
    filename         = "${path.module}/../../output/disconnect.zip"
    source_code_hash = filebase64sha256("${path.module}/../../output/disconnect.zip")
  }

  resource "aws_lambda_function" "message" {
    function_name    = "MessageHandler"
    handler          = "app.handler"
    runtime          = "nodejs18.x"
    role             = aws_iam_role.lambda_exec_role.arn
    filename         = "${path.module}/../../output/message.zip"
    source_code_hash = filebase64sha256("${path.module}/../../output/message.zip")
  }

  # Allow API Gateway to invoke the Lambdas
  resource "aws_lambda_permission" "allow_connect_invoke" {
    statement_id  = "AllowExecutionFromAPIGatewayConnect"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.connect.function_name
    principal     = "apigateway.amazonaws.com"
    source_arn    = "${aws_apigatewayv2_api.websocket_api.execution_arn}/*/*"
  }

  resource "aws_lambda_permission" "allow_disconnect_invoke" {
    statement_id  = "AllowExecutionFromAPIGatewayDisconnect"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.disconnect.function_name
    principal     = "apigateway.amazonaws.com"
    source_arn    = "${aws_apigatewayv2_api.websocket_api.execution_arn}/*/*"
  }

  resource "aws_lambda_permission" "allow_message_invoke" {
    statement_id  = "AllowExecutionFromAPIGatewayMessage"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.message.function_name
    principal     = "apigateway.amazonaws.com"
    source_arn    = "${aws_apigatewayv2_api.websocket_api.execution_arn}/*/*"
  }
