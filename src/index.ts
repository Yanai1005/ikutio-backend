import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  IKUTIO_KV: KVNamespace
}

interface Location {
  latitude: number
  longitude: number
  timestamp: number
}

interface LocationGroup {
  location_id: string
  locations: Location[]
}

interface LocationData {
  location_groups: LocationGroup[]
}

interface PostData {
  pathData: {
    latitude: number
    longitude: number
    timestamp: number
  }[]
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定を追加
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://192.168.179.12:5173',
    'https://192.168.179.12:5173',
    'https://ikutio-front-350092405998.asia-northeast1.run.app'
  ],
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/kv-test', async (c) => {
  const kv = c.env.IKUTIO_KV
  await kv.put('test-key', 'test-value')
  const value = await kv.get('test-key')
  return c.json({ key: 'test-key', value })
})

app.post('/locations', async (c) => {
  try {
    const body: PostData = await c.req.json()
    const kv = c.env.IKUTIO_KV

    const locationId = crypto.randomUUID()

    const locations = body.pathData.map(item => ({
      latitude: item.latitude,
      longitude: item.longitude,
      timestamp: item.timestamp
    }))

    const locationData: LocationData = {
      location_groups: [{
        location_id: locationId,
        locations: locations
      }]
    }

    const timestamp = Date.now()
    const key = `locations:${timestamp}`

    await kv.put(key, JSON.stringify(locationData))

    return c.json({ success: true, key, data: locationData }, 201)
  } catch (error) {
    return c.json({ success: false, error: 'Invalid JSON data' }, 400)
  }
})

app.get('/locations', async (c) => {
  try {
    const kv = c.env.IKUTIO_KV
    const list = await kv.list({ prefix: 'locations:' })

    const locations = []
    for (const key of list.keys) {
      const data = await kv.get(key.name)
      if (data) {
        const parsedData = JSON.parse(data)
        locations.push(...parsedData.location_groups)
      }
    }

    return c.json({ location_groups: locations })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to retrieve locations' }, 500)
  }
})

app.delete('/locations', async (c) => {
  try {
    const kv = c.env.IKUTIO_KV
    const list = await kv.list({ prefix: 'locations:' })

    for (const key of list.keys) {
      await kv.delete(key.name)
    }

    return c.json({ success: true, message: 'All location data cleared' })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to clear locations' }, 500)
  }
})

export default app
