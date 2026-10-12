package com.aistudio.bloggerautopublisher

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.aistudio.bloggerautopublisher.repository.BloggerRepository
import com.aistudio.bloggerautopublisher.ui.BloggerApp
import com.aistudio.bloggerautopublisher.ui.BloggerViewModel
import com.aistudio.bloggerautopublisher.ui.theme.BloggerAutoPublisherTheme

class MainActivity : ComponentActivity() {

    private val repository by lazy {
        BloggerRepository(applicationContext)
    }

    private val viewModel by viewModels<BloggerViewModel> {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return BloggerViewModel(repository) as T
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BloggerAutoPublisherTheme {
                BloggerApp(viewModel = viewModel)
            }
        }
    }
}
