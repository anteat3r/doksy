/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "dqxb7fwn3jr1twe",
    "created": "2026-04-24 19:01:55.378Z",
    "updated": "2026-04-24 19:01:55.378Z",
    "name": "documents",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "5b3jdf88",
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
        "id": "7vyl3rls",
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
        "id": "346kgati",
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
        "id": "dmugbqmi",
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
        "id": "ixuvwl79",
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
  const collection = dao.findCollectionByNameOrId("dqxb7fwn3jr1twe");

  return dao.deleteCollection(collection);
})
