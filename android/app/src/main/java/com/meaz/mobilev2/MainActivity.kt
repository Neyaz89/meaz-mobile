package com.meaz.mobilev2

import expo.modules.splashscreen.SplashScreenManager
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  
  companion object {
    private const val PERMISSION_REQUEST_CODE = 1001
    private val REQUIRED_PERMISSIONS = arrayOf(
      Manifest.permission.CAMERA,
      Manifest.permission.RECORD_AUDIO,
      Manifest.permission.MODIFY_AUDIO_SETTINGS,
      Manifest.permission.READ_CONTACTS,
      Manifest.permission.VIBRATE
    )
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
    
    // Request runtime permissions
    requestRuntimePermissions()
  }

  private fun requestRuntimePermissions() {
    val permissionsToRequest = mutableListOf<String>()
    
    // Check each required permission
    for (permission in REQUIRED_PERMISSIONS) {
      if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
        permissionsToRequest.add(permission)
      }
    }
    
    // Add storage permissions based on Android version
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val mediaPermissions = arrayOf(
        Manifest.permission.READ_MEDIA_IMAGES,
        Manifest.permission.READ_MEDIA_VIDEO,
        Manifest.permission.READ_MEDIA_AUDIO
      )
      for (permission in mediaPermissions) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
          permissionsToRequest.add(permission)
        }
      }
    } else {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
        permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE)
      }
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
          permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
      }
    }
    
    // Request permissions if needed
    if (permissionsToRequest.isNotEmpty()) {
      ActivityCompat.requestPermissions(
        this,
        permissionsToRequest.toTypedArray(),
        PERMISSION_REQUEST_CODE
      )
    }
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    
    if (requestCode == PERMISSION_REQUEST_CODE) {
      val deniedPermissions = mutableListOf<String>()
      for (i in permissions.indices) {
        if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
          deniedPermissions.add(permissions[i])
        }
      }
      
      if (deniedPermissions.isNotEmpty()) {
        // Log denied permissions for debugging
        android.util.Log.w("MainActivity", "Denied permissions: ${deniedPermissions.joinToString()}")
      }
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled
      ) {}
    )
  }

  /**
   * Align the back button behavior with Android S
   * where moving root activities to background instead of finishing activities.
   * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
   */
  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        // For non-root activities, use the default implementation to finish them.
        super.invokeDefaultOnBackPressed()
      }
      return
    }

    // Use the default back button implementation on Android S
    // because it's doing more than [Activity.moveTaskToBack] in fact.
    super.invokeDefaultOnBackPressed()
  }
}