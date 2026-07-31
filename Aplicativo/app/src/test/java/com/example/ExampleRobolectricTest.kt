package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("SIMITEC Equipe", appName)
  }

  @Test
  fun testViewModelInstantiation() {
    val application = ApplicationProvider.getApplicationContext<android.app.Application>()
    try {
      val viewModel = com.example.ui.SimitecViewModel(application)
      assert(viewModel != null)
    } catch (e: Throwable) {
      System.err.println("--- VM INSTANTIATION ERROR STACK TRACE ---")
      e.printStackTrace(System.err)
      var cause = e.cause
      while (cause != null) {
        System.err.println("Caused by:")
        cause.printStackTrace(System.err)
        cause = cause.cause
      }
      System.err.println("--- END OF VM INSTANTIATION ERROR STACK TRACE ---")
      throw e
    }
  }
}
