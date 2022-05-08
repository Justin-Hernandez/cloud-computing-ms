kubectl apply -f secreto.yaml

kubectl apply -f despliegue-mongodb.yaml
kubectl apply -f despliegue-redis.yaml

kubectl apply -f despliegue-user-service-v1.yaml
kubectl apply -f despliegue-message-service-v1.yaml
kubectl apply -f despliegue-auth-service-v1.yaml
kubectl apply -f despliegue-gateway-service-v1.yaml

kubectl apply -f istio-gateway.yaml
kubectl apply -f gateway-virtual-service.yaml
