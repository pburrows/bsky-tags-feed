export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  subscriber: Subscriber;
}

export type Post = {
  uri: string
  cid: string
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
  tag: string;
}

export type SubState = {
  service: string
  cursor: number
}

export type Subscriber = {
  did: string;
  createdAt: string;
  lastSeen: string;
  followingTags: string;
}