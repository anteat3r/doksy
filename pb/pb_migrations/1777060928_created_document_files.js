/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ypf52fqel1khg5x",
    "created": "2026-04-24 20:02:08.732Z",
    "updated": "2026-04-24 20:02:08.732Z",
    "name": "document_files",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "tcfrssms",
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
        "id": "koxbyy53",
        "name": "file",
        "type": "file",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "mimeTypes": null,
          "thumbs": null,
          "maxSelect": 1,
          "maxSize": 52428800,
          "protected": false
        }
      },
      {
        "system": false,
        "id": "aobzv5lx",
        "name": "name",
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
        "id": "1bb0nltw",
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
    "listRule": "document_id.owner = @request.auth.id || document_id.view_token = @request.headers.x_token || document_id.edit_token = @request.headers.x_token",
    "viewRule": "document_id.owner = @request.auth.id || document_id.view_token = @request.headers.x_token || document_id.edit_token = @request.headers.x_token",
    "createRule": "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)",
    "updateRule": "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)",
    "deleteRule": "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.headers.x_token = document_id.edit_token)",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ypf52fqel1khg5x");

  return dao.deleteCollection(collection);
})
