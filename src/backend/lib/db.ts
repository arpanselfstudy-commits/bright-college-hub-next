import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | undefined
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not defined')
  }

  // Reuse existing connection (handles Next.js hot-reload)
  if (global._mongooseConn) {
    return global._mongooseConn
  }

  if (mongoose.connection.readyState >= 1) {
    global._mongooseConn = mongoose
    return mongoose
  }

  /*
  Check Mongoose Internal State
    if (mongoose.connection.readyState >= 1)

    Mongoose connection states:

    State	Meaning
    0	disconnected
    1	connected
    2	connecting
    3	disconnecting

    So:

    >= 1

    means:

    ✅ already connected
    or
    ✅ currently connecting
  */

  const conn = await mongoose.connect(uri)
  global._mongooseConn = conn
  return conn
}


/*
Its main purpose:

✅ Prevent multiple DB connections
✅ Fix Next.js hot-reload issues
✅ Reuse connection globally
✅ Improve performance & stability


In a normal Node.js app:

Server starts → connect to DB once → reuse forever


Next.js Problem

During development:

files reload frequently
server modules re-execute
API routes re-import files

Result:

❌ Multiple MongoDB connections created
❌ Memory leak
❌ "Too many connections" error
❌ MongoDB crashes locally


Problem Without Global Cache

Next.js reloads modules like:

save file →
reload server module →
run connectDB again →
create NEW DB connection

You end up with:

connection 1
connection 2
connection 3
connection 4...

Bad.

Solution

Store connection globally:

global._mongooseConn

Now connection persists across reloads.

*/