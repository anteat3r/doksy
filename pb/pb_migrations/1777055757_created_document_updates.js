/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "eathmgkzjuonzwy",
    "created": "2026-04-24 18:35:57.930Z",
    "updated": "2026-04-24 18:35:57.930Z",
    "name": "document_updates",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "awguf6b0",
        "name": "document_id",
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
        "id": "miqyzai5",
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
        "id": "tn6snrj3",
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
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("eathmgkzjuonzwy");

  return dao.deleteCollection(collection);
})
