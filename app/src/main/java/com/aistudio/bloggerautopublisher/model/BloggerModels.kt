package com.aistudio.bloggerautopublisher.model

import kotlinx.serialization.Serializable

@Serializable
data class BloggerBlog(
    val id: String,
    val name: String,
    val description: String? = null,
    val url: String,
    val published: String? = null,
    val updated: String? = null,
    val totalPosts: Int = 0
)

@Serializable
data class PublishedPost(
    val id: String,
    val blogId: String,
    val title: String,
    val caption: String? = null,
    val url: String,
    val thumbnailUrl: String? = null,
    val imageUrl: String? = null,
    val labels: String? = null,
    val publishedAt: String
)

@Serializable
data class UserProfile(
    val userId: String,
    val email: String,
    val displayName: String? = null,
    val photoUrl: String? = null,
    val defaultBlogId: String? = null
)
