/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "a3hzyj03dzl0737",
    "created": "2026-04-24 18:35:57.924Z",
    "updated": "2026-04-24 18:35:57.924Z",
    "name": "documents",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "p7chlwia",
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
        "id": "z8mg4y08",
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
  const collection = dao.findCollectionByNameOrId("a3hzyj03dzl0737");

  return dao.deleteCollection(collection);
})
