kubectl delete service servicio-mongodb
kubectl delete service servicio-redis

kubectl delete service user-service
kubectl delete service message-service
kubectl delete service auth-service
kubectl delete service gateway-service

kubectl delete deployment despliegue-mongodb
kubectl delete deployment despliegue-redis

kubectl delete deployment user-service-v1
kubectl delete deployment message-service-v1
kubectl delete deployment auth-service-v1
kubectl delete deployment gateway-service-v1

kubectl delete deployment user-service-v2
kubectl delete deployment message-service-v2
kubectl delete deployment auth-service-v2
kubectl delete deployment gateway-service-v2

kubectl delete virtualservice user-virtual-service
kubectl delete virtualservice message-virtual-service
kubectl delete virtualservice auth-virtual-service
kubectl delete virtualservice gateway-virtual-service

kubectl delete gateway istio-gateway

kubectl delete destinationrule message-service
kubectl delete destinationrule auth-service

kubectl delete secret mongodb-credentials