import { AppContext } from './config'
import express from 'express'

const healthCheck = () => {
  const router = express.Router()

  router.get('/health-check', (req,res)=> {
    return res.sendStatus(200);
  })

  return router
}

export default healthCheck