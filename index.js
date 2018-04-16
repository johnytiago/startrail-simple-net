const async = require('async')
const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({ type: 'proc', exec: require('../js-ipfs') })

function spawnNodes(cb) {
  async.times( 3, (n, next) => {
    f.spawn(function (err, ipfsd) {
      if (err)
        return next(err)

      ipfsd.api.id(function (err, id) {
        if (err)
          return next(err)

        console.log("\nSTARTED PEER \n", id)
        next(null, {node: ipfsd, id})
      })
    })
  }, (err, nodes) => {
    if (err)
      return cb(err)

    cb(null, nodes)
  })
}

function listPeers (nodes , cb) {
  async.each(nodes, ({node}, next) => {
    node.api.swarm.peers(function (err, peerInfos) {
      if (err)
        return next(err)

      //console.log("\nPEER INFO \n", peerInfos)
      next()
    })
  }, (err) => {
    if (err)
      return cb(err)

    //console.log("\nNODES AT PEER LIST \n", nodes)
    cb(null, nodes)
  })
}

function connectNodes(nodes, cb) {
  async.each(nodes, ({node, id}, next) => {
    node.api.swarm.connect(id.addresses[0], (err, res) => {
      if (err) 
        return next(err)

      //console.log("\nCONNECTED TO \n", res)
      next()
    })
  }, (err) => {
    if (err)
      return cb(err)

    cb(null, nodes)
  })
}

function shareFile(nodes, cb) {
  async.waterfall([
    function(next) {
      const { node } = nodes[1]
      node.api.block.put(new Buffer("teste"), (err, res) => {
        if (err)
          next(err)

        console.log("\nADD BLOCK\n", res)
        next(null, res)
      })
    },

    function(block, next) {
      const { node } = nodes[0]
      node.api.block.get( block._cid, (err, _block) => {
        if (err)
          next(err)

        console.log("\nGET BLOCK\n", _block)
        next()
      })
    }
  ], (err) => {
    if (err)
      return cb(err)

    cb(null, nodes)
  })
}

function stopNodes (nodes, cb) {
  async.each(nodes, ({ node }, next) => { 
    node.stop((err) => {
      if (err)
        return next(err)

      next()
    })
  }, (err) => {
    if (err) 
      cb(err)

    console.log("\nNODES STOPPED")
    cb(null, nodes)
  })
}

async.waterfall([
  spawnNodes,
  connectNodes,
  listPeers,
  shareFile,
  stopNodes
], (err) => {
  if (err)
    throw err

  console.log("\nExiting...")
  process.exit(0)
})
