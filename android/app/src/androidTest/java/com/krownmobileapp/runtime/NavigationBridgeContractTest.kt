package com.krownmobileapp.runtime

import com.facebook.react.bridge.ReactMethod
import org.junit.Assert.assertEquals
import org.junit.Test

class NavigationBridgeContractTest {
    @Test fun asynchronousBridgeMethodsReturnVoid() {
        listOf(KrowNavigationModule::class.java, KrowNotificationsModule::class.java).forEach { module ->
            module.declaredMethods.forEach { method ->
                val annotation = method.getAnnotation(ReactMethod::class.java)
                if (annotation != null && !annotation.isBlockingSynchronousMethod) {
                    assertEquals("${module.simpleName}.${method.name} must not return Handler.post's Boolean", Void.TYPE, method.returnType)
                }
            }
        }
    }
}
