# Survey API

## Endpoints

### POST /api/surveys/:id/diff

This endpoint is used to autosave changes to a survey form. It accepts a batch of operations (diffs) that describe the changes made since a base version.

**URL Parameters:**

-   `id` (string, required): The ID of the survey being edited.

**Headers:**

-   `idempotency_key` (string, required): A unique key (e.g., a UUID) for the request. This is used to prevent duplicate operations on the server if the same request is sent multiple times.

**Request Body:**

The request body should be a JSON object with the following properties:

-   `base_version` (string, required): An ISO 8601 timestamp representing the version of the form that the operations are based on.
-   `ops` (array, required): An array of operation objects. Each object describes a single change to the form.

**Operation Object Structure:**

The structure of the operation object depends on the type of operation. Here are some examples:

-   **Add a block:**
    ```json
    {
      "op": "add",
      "block": {
        "id": "some-unique-id",
        "type": "short-text",
        "label": "Short Text Question",
        "helpText": "Help text goes here.",
        "required": false
      }
    }
    ```

-   **Remove a block:**
    ```json
    {
      "op": "remove",
      "blockId": "some-unique-id"
    }
    ```

-   **Move a block:**
    ```json
    {
      "op": "move",
      "blockId": "some-unique-id",
      "newIndex": 2
    }
    ```

-   **Edit a block property:**
    ```json
    {
      "op": "edit",
      "blockId": "some-unique-id",
      "property": "label",
      "value": "New Label Text"
    }
    ```

**Responses:**

-   **200 OK**: The diff was successfully received.
    ```json
    {
      "status": "ok"
    }
    ```
-   **400 Bad Request**: The request was invalid (e.g., missing required fields).
-   **409 Conflict**: The `idempotency_key` has been seen before, but the request body is different.
-   **500 Internal Server Error**: An unexpected error occurred on the server.
