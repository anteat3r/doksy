/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "o1ac4tz33rgx1v5",
    "created": "2026-04-25 12:23:11.632Z",
    "updated": "2026-04-25 12:23:11.632Z",
    "name": "aliases",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "up2ap7ff",
        "name": "alias",
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
        "id": "vlttqgg1",
        "name": "document_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "dqxb7fwn3jr1twe",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "nt6niu0z",
        "name": "mode",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "view",
            "edit"
          ]
        }
      },
      {
        "system": false,
        "id": "gqi5rgyv",
        "name": "token",
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
    "createRule": "@request.auth.id != '' && document_id.owner = @request.auth.id",
    "updateRule": "@request.auth.id != '' && document_id.owner = @request.auth.id",
    "deleteRule": "@request.auth.id != '' && document_id.owner = @request.auth.id",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("o1ac4tz33rgx1v5");

  return dao.deleteCollection(collection);
})
