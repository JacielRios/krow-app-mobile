#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE(KrowNotifications, NSObject)
RCT_EXTERN_METHOD(setSessionActive:(BOOL)active)
RCT_EXTERN_METHOD(requestToken:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(consumeRide:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
