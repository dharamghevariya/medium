import { Hono } from "hono";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@prisma/client/edge";
import { verify } from "hono/jwt";
import { createPostInput, updatePostInput } from "@dmghevariya/medium-inputs"

export const blogRouter = new Hono<{
    Bindings: {
		DATABASE_URL: string,
        JWT_SECRET: string
	},
    Variables: {
        userId: string
    }
}>()

blogRouter.use(async(c, next) => {
    const jwt = c.req.header('Authorization');
    if(!jwt) {
        c.status(401);
        return c.json({ error : "unauthorized" })
    }
    const token = jwt.split(' ')[1];
    const payload = await verify(token, c.env.JWT_SECRET)

    if (!payload) {
        c.status(401)
        return c.json({ error: "unauthorized" })
    }

    c.set("userId", payload.id as string);
    await next()
})

blogRouter.post('/', async (c) => {
    
    const body = await c.req.json()
    const { success } = createPostInput.safeParse(body)
    if(!success) {
        c.status(411);
        return c.json({
            message: "Input are not correct"
        })
    }

    const userId = c.get('userId')
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL
    }).$extends(withAccelerate())

    const post = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorID: userId
        }
    })
    return c.json({ id: post.id })
})

blogRouter.put('/', async (c) => {
    
    const body = await c.req.json()
    const { success } = updatePostInput.safeParse(body)
    if(!success) {
        c.status(411);
        return c.json({
            message: "Input are not correct"
        })
    }

    const userId = c.get('userId')
    
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    const updatedPost = await prisma.post.update({
        where: {
            id: body.id,
            authorID: userId
        },
        data: {
            title: body.title,
            content: body.content,
        }
    })

    return c.text('post updated')
})

blogRouter.get('/:id', async (c) => {
    const { id } = c.req.param()
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())

    const post = await prisma.post.findUnique({
        where: {
            id
        }
    })
    
    return c.json(post)
})