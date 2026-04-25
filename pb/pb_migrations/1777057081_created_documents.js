/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "03nymaqjipqgzih",
    "created": "2026-04-24 18:58:01.933Z",
    "updated": "2026-04-24 18:58:01.933Z",
    "name": "documents",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "dfp5unwx",
        "name": "title",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "s15ptlqc",
        "name": "state",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "4g3cmjkr",
        "name": "owner",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "cwbbkwv9",
        "name": "view_token",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "18e2a4at",
        "name": "edit_token",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != '' && owner = @request.auth.id",
    "updateRule": "@request.auth.id != '' && (owner = @request.auth.id || @request.data.edit_token = edit_token)",
    "deleteRule": "@request.auth.id != '' && owner = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("03nymaqjipqgzih");

  return dao.deleteCollection(collection);
})
