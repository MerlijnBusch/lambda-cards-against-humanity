resource "aws_apigatewayv2_api" "websocket_api" {
    name                       = "CahWebSocket"
    protocol_type              = "WEBSOCKET"
    route_selection_expression = "$request.body.action"
  }

  resource "aws_apigatewayv2_stage" "default_stage" {
    api_id      = aws_apigatewayv2_api.websocket_api.id
    name        = "dev"
    auto_deploy = true
  }
  