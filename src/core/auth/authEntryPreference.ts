let skipSplashOnNextAuthMount = false;

export function setSkipSplashOnNextAuthMount(value: boolean) {
  skipSplashOnNextAuthMount = value;
}

/** Lee y resetea: solo el primer montaje de AuthNavigator tras cerrar sesión debe consumirlo. */
export function consumeSkipSplashOnNextAuthMount(): boolean {
  const value = skipSplashOnNextAuthMount;
  skipSplashOnNextAuthMount = false;
  return value;
}
