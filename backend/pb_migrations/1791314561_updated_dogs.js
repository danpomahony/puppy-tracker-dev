/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_305563907")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_305563907")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.body.logged_by = @request.auth.id"
  }, collection)

  return app.save(collection)
})
