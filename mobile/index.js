import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// También asegura que, corras la app en Expo Go o en un build nativo,
// el entorno esté configurado correctamente
registerRootComponent(App);