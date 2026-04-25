/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dqxb7fwn3jr1twe")

  collection.listRule = "owner = @request.auth.id || view_token = @request.headers.x_token || edit_token = @request.headers.x_token"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("dqxb7fwn3jr1twe")

  collection.listRule = "owner = @request.auth.id"

  return dao.saveCollection(collection)
})
