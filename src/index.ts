import { Hono } from 'hono'

type Bindings = {
  IKUTIO_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/kv-test', async (c) => {
  const kv = c.env.IKUTIO_KV
  await kv.put('test-key', 'test-value')
  const value = await kv.get('test-key')
  return c.json({ key: 'test-key', value })
})

export default app
