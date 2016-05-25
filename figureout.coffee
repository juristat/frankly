express = require 'express'

dir = (what) -> console.dir(what, {colors: true, depth: null})
loud = (what) -> console.error "\n!!! #{what} !!!\n"

app = express()
loud 'new app'
dir app._router
loud 'app.get /'
app.get '/', ->
dir app._router
loud 'app.put /foo'
app.put '/foo', ->
dir app._router
loud 'app.post /'
app.post '/', ->
dir app._router
loud 'app.use /'
app.use '/', ->
dir app._router
