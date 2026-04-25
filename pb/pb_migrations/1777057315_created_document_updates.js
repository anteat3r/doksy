/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "frd2ld2rwd9f4r0",
    "created": "2026-04-24 19:01:55.395Z",
    "updated": "2026-04-24 19:01:55.395Z",
    "name": "document_updates",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "0ce9o9ta",
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
        "id": "srf80zh6",
        "name": "update_data",
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
        "id": "dsi5rqqr",
        "name": "client_id",
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
        "id": "5pneuwgv",
        "name": "edit_token",
        "type": "text",
        "required": false,
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
    "createRule": "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)",
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("frd2ld2rwd9f4r0");

  return dao.deleteCollection(collection);
})
