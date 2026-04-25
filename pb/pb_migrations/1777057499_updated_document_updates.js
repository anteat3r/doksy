/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("frd2ld2rwd9f4r0")

  collection.listRule = "document_id.view_token = @request.headers.x_token || document_id.edit_token = @request.headers.x_token || document_id.owner = @request.auth.id"
  collection.viewRule = "document_id.view_token = @request.headers.x_token || document_id.edit_token = @request.headers.x_token || document_id.owner = @request.auth.id"

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("frd2ld2rwd9f4r0")

  collection.listRule = ""
  collection.viewRule = ""

  return dao.saveCollection(collection)
})
