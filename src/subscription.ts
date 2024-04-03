import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { Post } from './db/schema'

let lastMetricWritten = new Date()
let newPostsMetric = 0

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate: Post[] = []

    for (const newPost of ops.posts.creates) {
      const inlineTag = newPost.record.facets?.find(p => p.features.find(q => q.$type === 'app.bsky.richtext.facet#tag'))
      if (!(inlineTag || (newPost.record.tags && newPost.record.tags.length > 0))) {
        continue
      }

      // console.log(newPost.record.text)
      const foundTags: string[] = []
      for (const facet of newPost.record.facets ?? []) {
        const tags = facet.features.filter(p => p.$type === 'app.bsky.richtext.facet#tag')
        for (const tag of tags) {
          foundTags.push(tag.tag + '')
        }
      }
      for (const extraTags of newPost.record.tags ?? []) {
        foundTags.push(extraTags)
      }

      const uniqueTags = [...new Set(foundTags)]
      for (const uniqueTag of uniqueTags) {
        postsToCreate.push(
          {
            uri: newPost.uri,
            cid: newPost.cid,
            replyParent: newPost.record?.reply?.parent.uri ?? null,
            replyRoot: newPost.record?.reply?.root.uri ?? null,
            indexedAt: new Date().toISOString(),
            tag: uniqueTag.toLowerCase(),
          },
        )

      }

    }

    const x = ops.posts.creates
      .filter((create) => {
        // only alf-related posts
        const inlineTag = create.record.facets?.find(p => p.features.find(q => q.$type === 'app.bsky.richtext.facet#tag'))
        if (inlineTag) {
          // console.log(create.record.text)
          return true
        }
        if (create.record.tags && create.record.tags.length > 0) {
          // console.log(create.record.text, create.record.tags)
          return true
        }
        // return create.record.text.toLowerCase().includes('alf')
      })
      .map((create) => {
        // map alf-related posts to a db row

        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
          tag: '',
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
    newPostsMetric += postsToCreate.length

    // delete old stuff
    const deletePoint = new Date()
    deletePoint.setDate(deletePoint.getDate()-2) // delete all posts over two days old
    const delCount = await this.db
      .deleteFrom('post')
      .where('indexedAt', '<', deletePoint.toISOString())
      .executeTakeFirst()
    if(delCount.numDeletedRows > 0) {
      console.log((new Date()).toISOString() + ' deleted old records: ' + delCount.numDeletedRows)
    }

    const now = new Date()
    const timeSinceLastMetric = now.getTime() - lastMetricWritten.getTime()
    if(timeSinceLastMetric > 1000 * 60) {// 1 minute
      console.log((new Date()).toISOString() + ' added new posts: ' + newPostsMetric)
      newPostsMetric = 0
      lastMetricWritten = new Date()

    }


  }
}
