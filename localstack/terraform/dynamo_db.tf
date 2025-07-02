resource "aws_dynamodb_table" "game_sessions" {
    name         = "GameSessions"
    billing_mode = "PAY_PER_REQUEST"
    hash_key     = "PK"
    range_key    = "SK"

    attribute {
      name = "PK"
      type = "S"
    }

    attribute {
      name = "SK"
      type = "S"
    }
  }

  resource "aws_dynamodb_table" "card_decks" {
    name         = "CardDecks"
    billing_mode = "PAY_PER_REQUEST"
    hash_key     = "PK"
    range_key    = "SK"

    attribute {
      name = "PK"
      type = "S"
    }

    attribute {
      name = "SK"
      type = "S"
    }
  }

  resource "aws_dynamodb_table" "connections" {
    name         = "Connections"
    billing_mode = "PAY_PER_REQUEST"
    hash_key     = "connectionId"

    attribute {
      name = "connectionId"
      type = "S"
    }
  }