---
layout: home

hero:
  name: "Kaleo"
  text: "Documentación Oficial"
  tagline: "Plataforma SaaS multi-tenant construida con Vue 3 + NestJS + PostgreSQL"
  image:
    src: /kaleo-logo.svg
    alt: Kaleo
  actions:
    - theme: brand
      text: Instalar y ejecutar →
      link: /inicio/instalacion
    - theme: alt
      text: Arquitectura
      link: /arquitectura/vision-general
    - theme: alt
      text: API REST
      link: /backend/api/

features:
  - icon: 🧑‍💻
    title: Para desarrolladores
    details: Arquitectura modular, composables reutilizables, sistema de diseño con 32 componentes UI, y guías paso a paso para crear cualquier tipo de módulo en minutos.
    link: /arquitectura/vision-general
    linkText: Ver arquitectura

  - icon: 🔌
    title: Para integradores
    details: API REST documentada con todos los endpoints, autenticación JWT, manejo multi-tenant con x-company-id, y referencia completa de permisos y roles.
    link: /backend/api/
    linkText: Ver API REST

  - icon: 👤
    title: Para usuarios
    details: Manual completo de uso de la plataforma — gestión de miembros, sedes, roles, auditoría y configuración de empresa.
    link: /usuario/inicio-sesion
    linkText: Ver manual de usuario

  - icon: ⚡
    title: Vue 3 + Composition API
    details: 100% Composition API con <script setup>. Pinia para estado, TanStack Table v9, composables reutilizables y patrón usePaginatedSetup para listas paginadas.
    link: /frontend/composables/
    linkText: Ver composables

  - icon: 🏗️
    title: NestJS + TypeORM
    details: API RESTful con guards globales, repositorios SQL tipados con rows<T>(), migraciones versionadas, auditoría automática y soporte multi-tenant por empresa.
    link: /backend/estructura
    linkText: Ver backend

  - icon: 🎨
    title: Sistema de diseño propio
    details: Design system completo con CSS custom properties, modo oscuro automático, y 32 componentes UI accesibles — sin dependencia de frameworks CSS externos.
    link: /arquitectura/tokens-diseno
    linkText: Ver tokens de diseño
---
